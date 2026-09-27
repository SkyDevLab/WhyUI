import { ElementAnalysis, StateChangeEvent } from '../shared/types';
import { generateMarkdownReport } from '../shared/reportGenerator';

export class InPageHud {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private container: HTMLElement | null = null;
  private currentAnalysis: ElementAnalysis | null = null;
  private isWatching = false;
  private watchLogs: StateChangeEvent[] = [];
  private onPickRequested: (() => void) | null = null;
  private onWatchToggle: ((watching: boolean) => void) | null = null;
  private onInspectBlockingRequested: (() => void) | null = null;

  // Dragging state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialLeft = 0;
  private initialTop = 0;

  constructor() {
    this.handleHeaderMouseDown = this.handleHeaderMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.init();
  }

  private init() {
    const existing = document.getElementById('whyui-hud-host');
    if (existing) existing.remove();

    this.host = document.createElement('div');
    this.host.id = 'whyui-hud-host';
    this.host.style.position = 'fixed';
    this.host.style.zIndex = '2147483646';
    this.host.style.bottom = '20px';
    this.host.style.right = '20px';
    this.host.style.pointerEvents = 'auto';

    this.shadow = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #e2e8f0;
      }
      * {
        box-sizing: border-box;
      }
      .whyui-panel {
        width: 440px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 40px);
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 12px;
        box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-size: 13px;
        line-height: 1.5;
        animation: whyuiSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes whyuiSlideIn {
        from { opacity: 0; transform: translateY(12px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .header {
        background: #1e293b;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #334155;
        user-select: none;
        cursor: grab;
      }
      .header:active {
        cursor: grabbing;
      }
      .brand-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .brand-icon {
        width: 22px;
        height: 22px;
        background: linear-gradient(135deg, #06b6d4, #3b82f6);
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 12px;
        color: #0f172a;
      }
      .title {
        font-weight: 700;
        color: #f8fafc;
        font-size: 13px;
      }
      .badge-brand {
        font-size: 10px;
        color: #94a3b8;
        background: #334155;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .btn-icon {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, color 0.15s;
      }
      .btn-icon:hover {
        background: #334155;
        color: #f8fafc;
      }
      .content {
        padding: 14px;
        overflow-y: auto;
        max-height: 480px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .content::-webkit-scrollbar {
        width: 6px;
      }
      .content::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 3px;
      }
      .element-card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 10px 12px;
      }
      .element-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .tag-selector {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 13px;
        font-weight: 600;
        color: #38bdf8;
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 9px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .status-interactive { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; }
      .status-potentially_blocked { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; }
      .status-not_interactive { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; }

      .section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #94a3b8;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .explanation-item {
        background: #1e293b;
        border-radius: 6px;
        padding: 8px 10px;
        margin-bottom: 6px;
        border-left: 3px solid #334155;
      }
      .exp-confirmed { border-left-color: #ef4444; }
      .exp-likely { border-left-color: #f59e0b; }
      .exp-possible { border-left-color: #3b82f6; }

      .exp-top {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 3px;
      }
      .confidence-badge {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 1px 5px;
        border-radius: 3px;
      }
      .conf-confirmed { background: #7f1d1d; color: #fecaca; }
      .conf-likely { background: #78350f; color: #fde68a; }
      .conf-possible { background: #1e3a8a; color: #bfdbfe; }

      .exp-title {
        font-weight: 600;
        color: #f1f5f9;
        font-size: 12px;
      }
      .exp-desc {
        color: #cbd5e1;
        font-size: 12px;
        margin-bottom: 4px;
      }
      .exp-evidence {
        font-family: ui-monospace, Menlo, monospace;
        font-size: 11px;
        color: #94a3b8;
        background: #0f172a;
        padding: 5px 8px;
        border-radius: 4px;
        margin-top: 4px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      /* Blocking Banner */
      .blocking-banner {
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid #ef4444;
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .blocking-header {
        font-weight: 700;
        color: #fca5a5;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .btn-inspect-blocking {
        align-self: flex-start;
        padding: 5px 10px;
        background: #dc2626;
        color: #fff;
        border: none;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 4px;
        transition: background 0.15s;
      }
      .btn-inspect-blocking:hover {
        background: #b91c1c;
      }

      /* Categorical Table */
      .categorical-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        background: #020617;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #334155;
      }
      .categorical-table td {
        padding: 5px 8px;
        border-bottom: 1px solid #1e293b;
      }
      .cat-name {
        color: #cbd5e1;
        font-weight: 600;
      }
      .cat-status {
        text-align: right;
        font-family: ui-monospace, monospace;
      }
      .status-tag-yes { color: #f87171; font-weight: 600; }
      .status-tag-no { color: #64748b; }

      /* Interaction Chain */
      .chain-box {
        background: #020617;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 8px 10px;
        font-family: ui-monospace, Menlo, monospace;
        font-size: 11px;
        color: #94a3b8;
        line-height: 1.6;
      }
      .chain-node-blocked {
        color: #f87171;
        font-weight: 600;
      }
      .chain-leaf {
        color: #38bdf8;
        font-weight: 700;
      }

      .tech-details {
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 8px;
        font-family: ui-monospace, Menlo, monospace;
        font-size: 11px;
      }
      .tech-row {
        display: flex;
        margin-bottom: 4px;
      }
      .tech-key {
        width: 110px;
        color: #94a3b8;
        flex-shrink: 0;
      }
      .tech-val {
        color: #38bdf8;
        word-break: break-all;
      }

      .actions-bar {
        background: #1e293b;
        padding: 10px 14px;
        border-top: 1px solid #334155;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .btn {
        flex: 1;
        min-width: 90px;
        padding: 7px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px solid transparent;
        transition: all 0.15s;
      }
      .btn-secondary {
        background: #334155;
        color: #f1f5f9;
        border-color: #475569;
      }
      .btn-secondary:hover {
        background: #475569;
      }
      .btn-watch-active {
        background: #dc2626 !important;
        border-color: #ef4444 !important;
        color: #ffffff;
      }

      .watch-logs {
        background: #020617;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 8px;
        max-height: 120px;
        overflow-y: auto;
        font-family: ui-monospace, monospace;
        font-size: 11px;
      }
      .watch-item {
        margin-bottom: 6px;
        border-bottom: 1px dashed #1e293b;
        padding-bottom: 4px;
      }
      .watch-time {
        color: #06b6d4;
      }
      .toast {
        position: absolute;
        top: 48px;
        left: 50%;
        transform: translateX(-50%);
        background: #10b981;
        color: #ffffff;
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        pointer-events: none;
        animation: toastFade 1.5s forwards;
      }
      @keyframes toastFade {
        0% { opacity: 0; transform: translate(-50%, -4px); }
        20% { opacity: 1; transform: translate(-50%, 0); }
        80% { opacity: 1; transform: translate(-50%, 0); }
        100% { opacity: 0; transform: translate(-50%, -4px); }
      }
    `;

    this.container = document.createElement('div');
    this.container.className = 'whyui-panel';
    this.container.style.display = 'none';

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.container);

    document.documentElement.appendChild(this.host);
  }

  // Draggable HUD implementation
  private handleHeaderMouseDown(e: MouseEvent) {
    if (!this.host) return;
    // Don't drag if clicking buttons in header
    if ((e.target as HTMLElement).closest('.btn-icon')) return;

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;

    const rect = this.host.getBoundingClientRect();
    this.initialLeft = rect.left;
    this.initialTop = rect.top;

    // Switch from bottom/right positioning to top/left coordinates
    this.host.style.bottom = 'auto';
    this.host.style.right = 'auto';
    this.host.style.left = `${this.initialLeft}px`;
    this.host.style.top = `${this.initialTop}px`;

    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDragging || !this.host) return;

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    let newLeft = this.initialLeft + dx;
    let newTop = this.initialTop + dy;

    // Viewport clamping
    const maxLeft = window.innerWidth - 450;
    const maxTop = window.innerHeight - 100;
    newLeft = Math.max(10, Math.min(newLeft, maxLeft));
    newTop = Math.max(10, Math.min(newTop, maxTop));

    this.host.style.left = `${newLeft}px`;
    this.host.style.top = `${newTop}px`;
  }

  private handleMouseUp() {
    this.isDragging = false;
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  setPickHandler(handler: () => void) {
    this.onPickRequested = handler;
  }

  setWatchToggleHandler(handler: (watching: boolean) => void) {
    this.onWatchToggle = handler;
  }

  setInspectBlockingHandler(handler: () => void) {
    this.onInspectBlockingRequested = handler;
  }

  showAnalysis(analysis: ElementAnalysis) {
    this.currentAnalysis = analysis;
    this.avoidObstructingTarget(analysis);
    this.render();
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  // Adjust HUD position if it obstructs the inspected element
  private avoidObstructingTarget(analysis: ElementAnalysis) {
    if (!this.host) return;

    // If host is already positioned by user dragging, keep user position
    if (this.host.style.left && this.host.style.left !== 'auto') {
      return;
    }

    const tRect = analysis.css.rect;
    const vpW = window.innerWidth || 1024;
    const vpH = window.innerHeight || 768;

    // If target element is in bottom-right corner, position HUD in top-right or bottom-left
    const isTargetInBottomRight = tRect.left > vpW * 0.5 && tRect.top > vpH * 0.5;
    if (isTargetInBottomRight) {
      this.host.style.bottom = 'auto';
      this.host.style.top = '20px';
      this.host.style.right = '20px';
    } else {
      this.host.style.top = 'auto';
      this.host.style.bottom = '20px';
      this.host.style.right = '20px';
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  addStateChange(event: StateChangeEvent) {
    this.watchLogs.unshift(event);
    if (this.watchLogs.length > 25) {
      this.watchLogs.pop();
    }
    this.render();
  }

  private showToast(message: string) {
    if (!this.container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), 1600);
  }

  private render() {
    if (!this.container || !this.currentAnalysis) return;

    const { target, interaction, explanations, framework, css, parent, overlay } = this.currentAnalysis;

    // Status styling based on Interaction Analysis
    const statusClass = `status-${interaction?.state || 'not_interactive'}`;
    const statusLabel = interaction?.statusLabel || (this.currentAnalysis.primaryStatus === 'enabled' ? '🟢 Interactive' : '🔴 Not clickable');

    // Explanations
    let explanationsHtml = '';
    if (explanations.length === 0) {
      explanationsHtml = '<div style="color: #34d399; font-size: 12px;">✓ No blocking conditions detected. Element is interactive.</div>';
    } else {
      explanationsHtml = explanations
        .map((exp) => {
          const confClass = `conf-${exp.confidence}`;
          const expClass = `exp-${exp.confidence}`;
          const evidenceItems = exp.evidence.map((ev) => `<div>• ${ev}</div>`).join('');
          return `
            <div class="explanation-item ${expClass}">
              <div class="exp-top">
                <span class="confidence-badge ${confClass}">${exp.confidence}</span>
                <span class="exp-title">${exp.title}</span>
              </div>
              <div class="exp-desc">${exp.description}</div>
              ${evidenceItems ? `<div class="exp-evidence">${evidenceItems}</div>` : ''}
            </div>
          `;
        })
        .join('');
    }

    // Blocking Element Banner if covered
    let blockingBannerHtml = '';
    if (overlay.isCovered && overlay.coveringElement) {
      const cov = overlay.coveringElement;
      blockingBannerHtml = `
        <div class="blocking-banner">
          <div class="blocking-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Element is covered by an overlay
          </div>
          <div style="font-family: ui-monospace, monospace; font-size: 11px; color: #f8fafc;">
            &lt;${cov.selector}&gt;
          </div>
          <div style="font-size: 11px; color: #cbd5e1;">
            Intersected: ${overlay.intersectedPoints.join(', ')} (${overlay.intersectedPoints.length}/${overlay.totalSampledPoints} points)
          </div>
          ${cov.rect && overlay.targetRect ? `
            <div style="font-family: ui-monospace, monospace; font-size: 10px; color: #94a3b8;">
              Target z-index: ${overlay.targetZIndex || 'auto'} | Blocking z-index: ${cov.zIndex || 'auto'}
            </div>
          ` : ''}
          <button id="whyui-btn-inspect-blocking" class="btn-inspect-blocking">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
            Inspect Blocking Element
          </button>
        </div>
      `;
    }

    // Categorical clickability reasons table
    let categoricalHtml = '';
    if (interaction?.categoricalReasons) {
      const rows = interaction.categoricalReasons.map((cat) => {
        const isYes = cat.status.includes('Confirmed') || cat.status.includes('Likely') || cat.status === 'Yes';
        const tagClass = isYes ? 'status-tag-yes' : 'status-tag-no';
        return `
          <tr>
            <td class="cat-name">${cat.name}</td>
            <td class="cat-status ${tagClass}">${cat.status}</td>
          </tr>
        `;
      }).join('');

      categoricalHtml = `
        <div>
          <div class="section-title">Clickability Factors</div>
          <table class="categorical-table">
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }

    // Interaction Chain
    let chainHtml = '';
    if (interaction?.interactionChain && interaction.interactionChain.length > 1) {
      const chainLines = interaction.interactionChain.map((node, i) => {
        const indent = '&nbsp;&nbsp;'.repeat(i);
        const isLeaf = i === interaction.interactionChain.length - 1;
        const markerClass = isLeaf ? 'chain-leaf' : node.isBlocking ? 'chain-node-blocked' : '';
        const markerText = isLeaf ? ' ← selected' : node.isBlocking ? ` [BLOCKED: ${node.blockingReason || 'non-interactive'}]` : '';
        return `<div>${indent}└── &lt;<span class="${markerClass}">${node.selector}</span>&gt;${markerText}</div>`;
      }).join('');

      chainHtml = `
        <div>
          <div class="section-title">Interaction Chain</div>
          <div class="chain-box">${chainLines}</div>
        </div>
      `;
    }

    // Watch logs section
    let watchLogsHtml = '';
    if (this.isWatching) {
      const items =
        this.watchLogs.length === 0
          ? '<div style="color: #94a3b8;">Observing DOM mutations & properties in real-time...</div>'
          : this.watchLogs
              .map(
                (log) => `
              <div class="watch-item">
                <div><span class="watch-time">[${log.timestamp}]</span> <strong>${log.trigger}</strong></div>
                <div style="color: #94a3b8;">Before: <code>${log.oldValue ?? 'null'}</code> → After: <code>${log.newValue ?? 'null'}</code></div>
              </div>
            `
              )
              .join('');

      watchLogsHtml = `
        <div>
          <div class="section-title">Live State Timeline</div>
          <div class="watch-logs">${items}</div>
        </div>
      `;
    }

    const iconUrl = typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('icons/icon48.png') : '';
    const brandIconHtml = iconUrl
      ? `<img src="${iconUrl}" class="brand-icon" alt="WhyUI" style="object-fit: cover; border: 1px solid #06b6d4;" />`
      : `<div class="brand-icon">?</div>`;

    this.container.innerHTML = `
      <div class="header" id="whyui-hud-header" title="Drag to reposition panel">
        <div class="brand-group">
          ${brandIconHtml}
          <span class="title">WhyUI</span>
          <span class="badge-brand">by SkyDevLab</span>
        </div>
        <div class="header-actions">
          <button id="whyui-btn-pick" class="btn-icon" title="Select another element">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
          </button>
          <button id="whyui-btn-close" class="btn-icon" title="Close panel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <div class="content">
        <div class="element-card">
          <div class="element-header">
            <span class="tag-selector">&lt;${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ''}&gt;</span>
            <span class="status-pill ${statusClass}">
              ${statusLabel}
            </span>
          </div>
          ${target.textPreview ? `<div style="color: #94a3b8; font-size: 11px;">"${target.textPreview}"</div>` : ''}
        </div>

        ${blockingBannerHtml}

        <div>
          <div class="section-title">Why can't I click?</div>
          ${explanationsHtml}
        </div>

        ${categoricalHtml}
        ${chainHtml}
        ${watchLogsHtml}

        <details>
          <summary style="cursor: pointer; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase;">
            Technical Details (Click to Expand)
          </summary>
          <div class="tech-details" style="margin-top: 6px;">
            <div class="tech-row"><span class="tech-key">Tag:</span><span class="tech-val">${target.tagName}</span></div>
            <div class="tech-row"><span class="tech-key">ID:</span><span class="tech-val">${target.id || 'none'}</span></div>
            <div class="tech-row"><span class="tech-key">Classes:</span><span class="tech-val">${target.classes.join(' ') || 'none'}</span></div>
            <div class="tech-row"><span class="tech-key">pointer-events:</span><span class="tech-val">${css.pointerEvents} (${interaction?.pointerEvents.source === 'ancestor' ? `inherited from ${interaction.pointerEvents.blockingElementSelector}` : 'direct'})</span></div>
            <div class="tech-row"><span class="tech-key">display:</span><span class="tech-val">${css.display}</span></div>
            <div class="tech-row"><span class="tech-key">visibility:</span><span class="tech-val">${css.visibility}</span></div>
            <div class="tech-row"><span class="tech-key">opacity:</span><span class="tech-val">${css.opacity}</span></div>
            <div class="tech-row"><span class="tech-key">off-screen:</span><span class="tech-val">${String(css.isOffScreen)}</span></div>
            <div class="tech-row"><span class="tech-key">Event Listeners:</span><span class="tech-val">${interaction?.eventListeners.statusText || 'None'}</span></div>
            <div class="tech-row"><span class="tech-key">Parent Fieldset:</span><span class="tech-val">${parent.inDisabledFieldset ? 'Disabled' : 'Enabled'}</span></div>
            <div class="tech-row"><span class="tech-key">Framework:</span><span class="tech-val">${framework.detected ? framework.name : 'Standard DOM'}</span></div>
          </div>
        </details>
      </div>

      <div class="actions-bar">
        <button id="whyui-btn-watch" class="btn ${this.isWatching ? 'btn-watch-active' : 'btn-secondary'}">
          ${this.isWatching ? 'Stop Watch' : 'Watch Changes'}
        </button>
        <button id="whyui-btn-copy-report" class="btn btn-secondary">
          Copy Report
        </button>
        <button id="whyui-btn-copy-html" class="btn btn-secondary">
          Copy HTML
        </button>
      </div>
    `;

    // Wire up events
    const headerEl = this.container.querySelector('#whyui-hud-header') as HTMLElement;
    headerEl?.addEventListener('mousedown', this.handleHeaderMouseDown);

    const pickBtn = this.container.querySelector('#whyui-btn-pick');
    pickBtn?.addEventListener('click', () => {
      if (this.onPickRequested) this.onPickRequested();
    });

    const closeBtn = this.container.querySelector('#whyui-btn-close');
    closeBtn?.addEventListener('click', () => {
      this.hide();
    });

    const inspectBlockingBtn = this.container.querySelector('#whyui-btn-inspect-blocking');
    inspectBlockingBtn?.addEventListener('click', () => {
      if (this.onInspectBlockingRequested) {
        this.onInspectBlockingRequested();
      }
    });

    const watchBtn = this.container.querySelector('#whyui-btn-watch');
    watchBtn?.addEventListener('click', () => {
      this.isWatching = !this.isWatching;
      if (this.onWatchToggle) this.onWatchToggle(this.isWatching);
      this.render();
    });

    const copyReportBtn = this.container.querySelector('#whyui-btn-copy-report');
    copyReportBtn?.addEventListener('click', () => {
      if (this.currentAnalysis) {
        const report = generateMarkdownReport(this.currentAnalysis);
        navigator.clipboard.writeText(report).then(() => {
          this.showToast('Report copied to clipboard!');
        });
      }
    });

    const copyHtmlBtn = this.container.querySelector('#whyui-btn-copy-html');
    copyHtmlBtn?.addEventListener('click', () => {
      if (this.currentAnalysis) {
        navigator.clipboard.writeText(this.currentAnalysis.target.outerHTML).then(() => {
          this.showToast('HTML copied to clipboard!');
        });
      }
    });
  }

  destroy() {
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }
  }
}
