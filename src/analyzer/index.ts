import { ElementAnalysis } from '../shared/types';
import { extractElementSummary, analyzeHtml } from './htmlAnalyzer';
import { analyzeCss } from './cssAnalyzer';
import { analyzeParents } from './parentAnalyzer';
import { analyzeForm } from './formAnalyzer';
import { analyzeOverlay } from './overlayAnalyzer';
import { analyzeEvents } from './eventAnalyzer';
import { detectFramework } from '../framework/detector';
import { determinePrimaryStatus, generateExplanations } from './explanationEngine';
import { analyzeInteraction } from './interactionAnalyzer';

/**
 * Performs a comprehensive analysis of the given DOM element with robust error handling.
 */
export function analyzeElement(element: HTMLElement): ElementAnalysis {
  const now = new Date();
  const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
  const url = window.location?.href || 'https://example.com';

  // Defensive check for detached or inaccessible elements
  if (!element || typeof element.getBoundingClientRect !== 'function') {
    return createInaccessibleFallback(element, url, timestamp, 'Element reference is invalid or inaccessible.');
  }

  try {
    const target = extractElementSummary(element);
    const html = analyzeHtml(element);
    const css = analyzeCss(element);
    const parent = analyzeParents(element);
    const form = analyzeForm(element);
    const overlay = analyzeOverlay(element);
    const events = analyzeEvents(element);
    const framework = detectFramework(element);

    const engineInput = { html, css, parent, form, overlay, events };
    const { status, isInteractive } = determinePrimaryStatus(engineInput);
    const explanations = generateExplanations(engineInput);

    const interaction = analyzeInteraction({
      element,
      html,
      css,
      parent,
      overlay,
      events,
    });

    return {
      target,
      isInteractive,
      primaryStatus: status,
      interaction,
      html,
      css,
      parent,
      form,
      overlay,
      events,
      framework,
      explanations,
      url,
      timestamp,
    };
  } catch (err: any) {
    return createInaccessibleFallback(
      element,
      url,
      timestamp,
      `Unable to inspect this element. Reason: ${err?.message || 'The element belongs to an inaccessible context.'}`
    );
  }
}

function createInaccessibleFallback(
  element: any,
  url: string,
  timestamp: string,
  reason: string
): ElementAnalysis {
  const tagName = element?.tagName || 'UNKNOWN';
  return {
    target: {
      tagName,
      id: element?.id || '',
      classes: [],
      role: null,
      attributes: {},
      outerHTML: `<${tagName.toLowerCase()}>`,
      textPreview: '',
      selector: tagName.toLowerCase(),
    },
    isInteractive: false,
    primaryStatus: 'non-interactive',
    interaction: {
      state: 'not_interactive',
      statusLabel: '🔴 Inaccessible',
      primaryReason: reason,
      canClick: false,
      pointerEvents: { value: 'unknown', isBlocked: true, source: 'none' },
      visibility: {
        display: 'unknown',
        visibility: 'unknown',
        opacity: '1',
        isZeroSized: false,
        isOffScreen: false,
        visualState: 'visible',
        visualDescription: reason,
        canReceivePointerEvents: false,
      },
      overlay: { isCovered: false, intersectedPoints: [], totalSampledPoints: 0 },
      ancestorBlock: { isBlocked: true, reason },
      interactionChain: [{ tagName, selector: tagName.toLowerCase(), isBlocking: true, blockingReason: reason }],
      eventListeners: { hasInlineClick: false, observableFrameworkHandlers: [], statusText: reason },
      categoricalReasons: [],
    },
    html: {
      tagName,
      id: '',
      classes: [],
      disabledAttr: false,
      disabledProp: false,
      ariaDisabled: null,
      readonlyAttr: false,
      hiddenAttr: false,
      inertAttr: false,
      isStandardFormControl: false,
      typeAttr: null,
      roleAttr: null,
      allAttributes: {},
    },
    css: {
      pointerEvents: 'unknown',
      display: 'unknown',
      visibility: 'unknown',
      opacity: '1',
      cursor: 'unknown',
      userSelect: 'unknown',
      isZeroSized: false,
      isOffScreen: false,
      rect: { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 },
    },
    parent: {
      inDisabledFieldset: false,
      inLegendException: false,
      inertAncestor: false,
      hiddenAncestor: false,
      pointerEventsAncestor: false,
      ancestorIssues: [],
      parentChain: [],
      interactionChain: [],
    },
    form: {
      hasForm: false,
      isFormValid: true,
      totalFields: 0,
      invalidFieldsCount: 0,
      requiredFieldsCount: 0,
      fields: [],
    },
    overlay: { isCovered: false, intersectedPoints: [], totalSampledPoints: 0 },
    events: { hasInlineHandlers: false, hasDynamicMutation: false, dynamicallyControlled: false, details: [] },
    framework: { detected: false, deepInspectionAvailable: false },
    explanations: [
      {
        id: 'inaccessible-element',
        severity: 'error',
        confidence: 'confirmed',
        category: 'interaction',
        title: 'Unable to inspect this element',
        description: reason,
        evidence: ['The element belongs to an inaccessible context, closed shadow DOM, or cross-origin iframe.'],
      },
    ],
    url,
    timestamp,
  };
}
