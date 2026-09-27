import React, { useState, useEffect } from 'react';
import { ElementAnalysis, StateChangeEvent } from '../shared/types';
import { MESSAGE_TYPES } from '../shared/messages';
import { generateMarkdownReport } from '../shared/reportGenerator';

export const App: React.FC = () => {
  const [analysis, setAnalysis] = useState<ElementAnalysis | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [watchLogs, setWatchLogs] = useState<StateChangeEvent[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [techOpen, setTechOpen] = useState<boolean>(false);
  const [pageNotice, setPageNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1800);
  };

  const sendTabMessage = (
    message: any,
    callback?: (response: any) => void
  ) => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      callback?.(null);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Consume lastError if tab query had an issue
      if (chrome.runtime.lastError) {
        callback?.(null);
        return;
      }

      const tab = tabs[0];
      if (!tab?.id) {
        callback?.(null);
        return;
      }

      const url = tab.url || '';

      // Check for restricted browser internal URLs
      if (
        url.startsWith('edge://') ||
        url.startsWith('chrome://') ||
        url.startsWith('about:') ||
        url.startsWith('view-source:')
      ) {
        setPageNotice(
          'WhyUI cannot run on internal browser pages (' +
            (url.split('/')[0] || 'edge:') +
            '//). Please open a regular webpage or file to inspect.'
        );
        callback?.(null);
        return;
      }

      const tabId = tab.id;

      // Attempt sending the message to the active tab's content script
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          // If receiving end does not exist, auto-inject contentScript.js via scripting API
          if (typeof chrome.scripting !== 'undefined' && chrome.scripting.executeScript) {
            chrome.scripting.executeScript(
              {
                target: { tabId },
                files: ['contentScript.js'],
              },
              () => {
                const injectErr = chrome.runtime.lastError;
                if (injectErr) {
                  if (url.startsWith('file://')) {
                    setPageNotice(
                      'To inspect local file:// pages, please open edge://extensions/ and enable "Allow access to file URLs" for WhyUI.'
                    );
                  } else {
                    setPageNotice(
                      'Unable to connect to this tab: ' + injectErr.message + '. Please refresh the page.'
                    );
                  }
                  callback?.(null);
                  return;
                }

                // Injected successfully! Retry message with clean lastError consumption
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabId, message, (retryRes) => {
                    void chrome.runtime.lastError; // Clear lastError
                    callback?.(retryRes);
                  });
                }, 100);
              }
            );
            return;
          }

          callback?.(null);
          return;
        }

        callback?.(response);
      });
    });
  };

  useEffect(() => {
    // 1. Fetch cached analysis from storage
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['whyui_current_analysis'], (res) => {
        if (res.whyui_current_analysis) {
          setAnalysis(res.whyui_current_analysis);
        }
      });
    }

    // 2. Query active tab for latest analysis via safe sender
    sendTabMessage({ type: MESSAGE_TYPES.GET_CURRENT_ANALYSIS }, (response) => {
      if (response?.payload) {
        setAnalysis(response.payload);
      }
    });

    // 3. Listen for runtime messages (e.g. ELEMENT_SELECTED or STATE_CHANGE_EVENT)
    const listener = (message: any) => {
      if (message?.type === MESSAGE_TYPES.ELEMENT_SELECTED && message.payload) {
        setAnalysis(message.payload);
      }
      if (message?.type === MESSAGE_TYPES.STATE_CHANGE_EVENT && message.payload) {
        setWatchLogs((prev) => [message.payload, ...prev.slice(0, 19)]);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(listener);
      return () => {
        chrome.runtime.onMessage.removeListener(listener);
      };
    }
  }, []);

  const handleSelectElement = () => {
    sendTabMessage({ type: MESSAGE_TYPES.START_SELECTION }, (response) => {
      if (response?.success) {
        window.close();
      }
    });
  };

  const handleInspectBlocking = () => {
    sendTabMessage({ type: MESSAGE_TYPES.INSPECT_BLOCKING_ELEMENT }, (response) => {
      if (response?.payload) {
        setAnalysis(response.payload);
        showToast('Inspecting Blocking Element');
      }
    });
  };

  const handleToggleWatch = () => {
    const nextWatch = !isWatching;
    setIsWatching(nextWatch);
    sendTabMessage({
      type: nextWatch ? MESSAGE_TYPES.START_WATCHER : MESSAGE_TYPES.STOP_WATCHER,
    });
  };

  const handleCopyReport = () => {
    if (!analysis) return;
    const report = generateMarkdownReport(analysis);
    navigator.clipboard.writeText(report).then(() => {
      showToast('Markdown Report Copied!');
    });
  };

  const handleCopyHtml = () => {
    if (!analysis?.target?.outerHTML) return;
    navigator.clipboard.writeText(analysis.target.outerHTML).then(() => {
      showToast('HTML Snippet Copied!');
    });
  };

  const handleOpenHud = () => {
    sendTabMessage({ type: MESSAGE_TYPES.TOGGLE_IN_PAGE_HUD }, () => {
      window.close();
    });
  };

  const statusLabel = analysis?.interaction?.statusLabel || (analysis?.primaryStatus === 'enabled' ? '🟢 Interactive' : '🔴 Not clickable');
  const statusClass = `status-${analysis?.interaction?.state || 'not_interactive'}`;

  return (
    <div className="popup-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <img src="/icons/icon48.png" className="logo-badge" alt="WhyUI" style={{ objectFit: 'cover', border: '1px solid #06b6d4' }} />
          <div>
            <div className="brand-title">WhyUI</div>
            <div className="brand-subtitle">Browser UI Interaction Debugger</div>
          </div>
        </div>
        <span className="brand-pill">by SkyDevLab</span>
      </header>

      {/* Page Notice Banner */}
      {pageNotice && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: 6,
            padding: '8px 12px',
            margin: '10px 12px 0',
            color: '#fca5a5',
            fontSize: 12,
            lineHeight: 1.4,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: 14 }}>⚠️</span>
          <div>{pageNotice}</div>
        </div>
      )}

      {/* Select Element Action Bar */}
      <div className="pick-action-container">
        <button className="btn-select" onClick={handleSelectElement}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
          Select Element on Page
        </button>
      </div>

      {/* Main Body */}
      <main className="main-content">
        {!analysis ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>No Element Inspected</div>
            <div style={{ fontSize: 12 }}>
              Click <strong>"Select Element on Page"</strong> above, then hover and click any UI element or button to diagnose why it cannot be clicked or interacted with.
            </div>
          </div>
        ) : (
          <>
            {/* Selected Element Card */}
            <div className="card">
              <div className="element-top-row">
                <span className="tag-selector">
                  &lt;{analysis.target.tagName.toLowerCase()}
                  {analysis.target.id ? `#${analysis.target.id}` : ''}&gt;
                </span>
                <span className={`status-badge ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>
              {analysis.target.textPreview && (
                <div style={{ color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>
                  "{analysis.target.textPreview}"
                </div>
              )}
            </div>

            {/* Blocking Overlay Banner */}
            {analysis.overlay.isCovered && analysis.overlay.coveringElement && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontWeight: 700, color: '#fca5a5', fontSize: 12 }}>
                  ⚠️ Element Covered by Overlay
                </div>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#f8fafc' }}>
                  &lt;{analysis.overlay.coveringElement.selector}&gt;
                </div>
                <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                  Intersected: {analysis.overlay.intersectedPoints.join(', ')} ({analysis.overlay.intersectedPoints.length}/{analysis.overlay.totalSampledPoints} points)
                </div>
                <button
                  onClick={handleInspectBlocking}
                  style={{
                    alignSelf: 'flex-start',
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Inspect Blocking Element
                </button>
              </div>
            )}

            {/* Why Can't I Click? Explanations */}
            <div>
              <div className="section-label">
                <span>Why can't I click?</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>Deterministic Evidence</span>
              </div>

              {analysis.explanations.length === 0 ? (
                <div style={{ color: '#34d399', fontSize: 12, padding: 8 }}>
                  ✓ No blocking conditions detected. Element is interactive.
                </div>
              ) : (
                analysis.explanations.map((exp) => (
                  <div key={exp.id} className={`explanation-card exp-${exp.confidence}`}>
                    <div className="exp-badge-group">
                      <span className={`confidence-tag conf-${exp.confidence}`}>
                        {exp.confidence === 'confirmed' ? '🔴 Confirmed' : exp.confidence === 'likely' ? '🟠 Likely' : '🟡 Possible'}
                      </span>
                      <span className="exp-title-text">{exp.title}</span>
                    </div>
                    <div className="exp-desc-text">{exp.description}</div>
                    {exp.evidence.length > 0 && (
                      <div className="evidence-box">
                        {exp.evidence.map((ev, i) => (
                          <div key={i}>• {ev}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Categorical Clickability Factors */}
            {analysis.interaction?.categoricalReasons && (
              <div>
                <div className="section-label">Clickability Factors</div>
                <div
                  style={{
                    background: '#020617',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '6px 8px',
                    fontSize: 11,
                  }}
                >
                  {analysis.interaction.categoricalReasons.map((cat, idx) => {
                    const isYes = cat.status.includes('Confirmed') || cat.status.includes('Likely') || cat.status === 'Yes';
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '3px 0',
                          borderBottom: idx < analysis.interaction.categoricalReasons.length - 1 ? '1px solid #1e293b' : 'none',
                        }}
                      >
                        <span style={{ color: '#cbd5e1' }}>{cat.name}</span>
                        <span style={{ color: isYes ? '#f87171' : '#64748b', fontWeight: isYes ? 600 : 400 }}>
                          {cat.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interaction Chain */}
            {analysis.interaction?.interactionChain && analysis.interaction.interactionChain.length > 1 && (
              <div>
                <div className="section-label">Interaction Chain</div>
                <div
                  style={{
                    background: '#020617',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 10px',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 11,
                    lineHeight: 1.5,
                  }}
                >
                  {analysis.interaction.interactionChain.map((node, i) => {
                    const isLeaf = i === analysis.interaction.interactionChain.length - 1;
                    return (
                      <div key={i} style={{ paddingLeft: i * 8 }}>
                        └── &lt;
                        <span style={{ color: isLeaf ? '#38bdf8' : node.isBlocking ? '#f87171' : '#94a3b8', fontWeight: isLeaf || node.isBlocking ? 700 : 400 }}>
                          {node.selector}
                        </span>
                        &gt;
                        {isLeaf && <span style={{ color: '#38bdf8' }}> ← selected</span>}
                        {node.isBlocking && <span style={{ color: '#f87171' }}> [BLOCKED: {node.blockingReason}]</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form Analysis */}
            {analysis.form.hasForm && (
              <div>
                <div className="section-label">
                  <span>Related Form Controls</span>
                  <span style={{ color: analysis.form.invalidFieldsCount > 0 ? '#f87171' : '#34d399' }}>
                    {analysis.form.invalidFieldsCount > 0 ? `❌ ${analysis.form.invalidFieldsCount} Invalid` : '✓ All Valid'}
                  </span>
                </div>
                {analysis.form.fields.slice(0, 5).map((f, i) => (
                  <div key={i} className="form-item-row">
                    <span className="form-item-name">{f.label || f.name || f.id || f.tagName}</span>
                    <span
                      className="form-item-status"
                      style={{ color: f.valid ? '#34d399' : '#f87171' }}
                    >
                      {f.statusSummary}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Framework Detection */}
            {analysis.framework.detected && (
              <div>
                <div className="section-label">Framework Detected</div>
                <div className="framework-card">
                  <span style={{ fontWeight: 600, color: '#38bdf8' }}>{analysis.framework.name}</span>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>Deep state analysis: Coming soon (v2)</span>
                </div>
              </div>
            )}

            {/* Watch Logs Timeline */}
            {isWatching && (
              <div>
                <div className="section-label">State Change Timeline</div>
                <div className="tech-details-box" style={{ maxHeight: 110, overflowY: 'auto' }}>
                  {watchLogs.length === 0 ? (
                    <div style={{ color: '#94a3b8' }}>Watching mutations & properties in real-time...</div>
                  ) : (
                    watchLogs.map((log, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        <span style={{ color: '#06b6d4' }}>[{log.timestamp}]</span> {log.trigger}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Technical Details Collapsible */}
            <div>
              <div
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  color: '#94a3b8',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
                onClick={() => setTechOpen(!techOpen)}
              >
                <span>Technical Details</span>
                <span>{techOpen ? '▲' : '▼'}</span>
              </div>

              {techOpen && (
                <div className="tech-details-box">
                  <div className="tech-grid-row">
                    <span className="tech-grid-key">Tag:</span>
                    <span className="tech-grid-val">{analysis.target.tagName}</span>
                  </div>
                  <div className="tech-grid-row">
                    <span className="tech-grid-key">ID:</span>
                    <span className="tech-grid-val">{analysis.target.id || 'none'}</span>
                  </div>
                  <div className="tech-grid-row">
                    <span className="tech-grid-key">Classes:</span>
                    <span className="tech-grid-val">{analysis.target.classes.join(' ') || 'none'}</span>
                  </div>
                  <div className="tech-grid-row">
                    <span className="tech-grid-key">pointer-events:</span>
                    <span className="tech-grid-val">{analysis.css.pointerEvents}</span>
                  </div>
                  <div className="tech-grid-row">
                    <span className="tech-grid-key">display:</span>
                    <span className="tech-grid-val">{analysis.css.display}</span>
                  </div>
                  <div className="tech-grid-row">
                    <span className="tech-grid-key">visibility:</span>
                    <span className="tech-grid-val">{analysis.css.visibility}</span>
                  </div>
                  <div className="tech-grid-row">
                    <span className="tech-grid-key">opacity:</span>
                    <span className="tech-grid-val">{analysis.css.opacity}</span>
                  </div>
                  <div className="tech-grid-row">
                    <span className="tech-grid-key">off-screen:</span>
                    <span className="tech-grid-val">{String(analysis.css.isOffScreen)}</span>
                  </div>
                  <div className="tech-grid-row">
                    <span className="tech-grid-key">Event Listeners:</span>
                    <span className="tech-grid-val">{analysis.interaction?.eventListeners.statusText || 'None'}</span>
                  </div>
                  <div className="tech-grid-row">
                    <span className="tech-grid-key">Parent Fieldset:</span>
                    <span className="tech-grid-val">{analysis.parent.inDisabledFieldset ? 'Disabled' : 'Enabled'}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer Actions */}
      {analysis && (
        <footer className="footer-actions">
          {analysis.overlay.isCovered && (
            <button className="btn-secondary" style={{ color: '#fca5a5' }} onClick={handleInspectBlocking}>
              Inspect Blocking
            </button>
          )}
          <button
            className={`btn-secondary ${isWatching ? 'btn-watch-active' : ''}`}
            onClick={handleToggleWatch}
          >
            {isWatching ? 'Stop Watch' : 'Watch Changes'}
          </button>
          <button className="btn-secondary" onClick={handleCopyReport}>
            Copy Report
          </button>
          <button className="btn-secondary" onClick={handleCopyHtml}>
            Copy HTML
          </button>
          <button className="btn-secondary" title="Dock In-Page Panel" onClick={handleOpenHud}>
            HUD
          </button>
        </footer>
      )}

      {toastMessage && <div className="toast-msg">{toastMessage}</div>}
    </div>
  );
};
