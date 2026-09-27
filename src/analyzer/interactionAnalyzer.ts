import {
  HtmlAnalysis,
  CssAnalysis,
  ParentAnalysis,
  OverlayAnalysis,
  EventAnalysis,
  InteractionAnalysis,
  PointerEventsInfo,
  VisibilityInfo,
  CategoricalInteractionReason,
  AncestorChainNode,
} from '../shared/types';
import { buildSelector } from './parentAnalyzer';

export interface InteractionAnalyzerInput {
  element: HTMLElement;
  html: HtmlAnalysis;
  css: CssAnalysis;
  parent: ParentAnalysis;
  overlay: OverlayAnalysis;
  events: EventAnalysis;
}

/**
 * Analyzes pointer interaction and clickability across HTML, CSS, parent cascade, and viewport geometry.
 */
export function analyzeInteraction(input: InteractionAnalyzerInput): InteractionAnalysis {
  const { element, html, css, parent, overlay } = input;

  // 1. Pointer-events analysis
  let pointerEventsSource: 'self' | 'ancestor' | 'none' = 'none';
  let blockingAncestorSelector: string | undefined;
  let blockingTagName: string | undefined;

  const isSelfDirect = element.style.pointerEvents === 'none';
  const isAncestorPointerNone = parent.pointerEventsAncestor;
  const isComputedPointerNone = css.pointerEvents === 'none';

  if (isSelfDirect) {
    pointerEventsSource = 'self';
  } else if (isAncestorPointerNone) {
    pointerEventsSource = 'ancestor';
    const blockingIssue = parent.ancestorIssues.find((i) => i.issueType === 'pointer-events-none');
    if (blockingIssue) {
      blockingTagName = blockingIssue.tagName;
      blockingAncestorSelector = `${blockingIssue.tagName.toLowerCase()}${blockingIssue.id ? `#${blockingIssue.id}` : ''}${
        blockingIssue.classes.length > 0 ? `.${blockingIssue.classes.join('.')}` : ''
      }`;
    }
  } else if (isComputedPointerNone) {
    pointerEventsSource = 'self';
  }

  const pointerEventsInfo: PointerEventsInfo = {
    value: css.pointerEvents,
    isBlocked: isSelfDirect || isAncestorPointerNone || isComputedPointerNone,
    source: pointerEventsSource,
    blockingElementSelector: blockingAncestorSelector,
    blockingTagName,
  };

  // 2. Visibility analysis
  let visualState: VisibilityInfo['visualState'] = 'visible';
  let visualDescription = 'Element is rendered and within the visible viewport.';
  let canReceivePointer = true;

  const isZeroOpacity = parseFloat(css.opacity) <= 0.02;

  if (css.display === 'none') {
    visualState = 'hidden_display_none';
    visualDescription = 'Element has display: none and is removed from the visual render tree.';
    canReceivePointer = false;
  } else if (css.visibility === 'hidden' || css.visibility === 'collapse') {
    visualState = 'invisible_visibility_hidden';
    visualDescription = `Element has visibility: ${css.visibility} and cannot receive mouse clicks.`;
    canReceivePointer = false;
  } else if (parent.hiddenAncestor) {
    visualState = 'hidden_display_none';
    visualDescription = 'An enclosing ancestor container is hidden via display: none or visibility: hidden.';
    canReceivePointer = false;
  } else if (isZeroOpacity) {
    visualState = 'transparent_opacity_zero';
    visualDescription = 'Element has opacity: 0 (invisible visually, but can still receive pointer events if not otherwise blocked).';
    canReceivePointer = true; // opacity: 0 elements can receive clicks!
  } else if (css.isOffScreen) {
    visualState = 'off_screen';
    visualDescription = `Element is positioned outside the viewport (x: ${css.rect.left}, y: ${css.rect.top}).`;
    canReceivePointer = false;
  } else if (css.isZeroSized) {
    visualState = 'zero_sized';
    visualDescription = 'Element has 0px dimensions (width = 0 or height = 0).';
    canReceivePointer = false;
  } else if (isZeroOpacity) {
    visualState = 'transparent_opacity_zero';
    visualDescription = 'Element has opacity: 0 (invisible visually, but can still receive pointer events if not otherwise blocked).';
    canReceivePointer = true; // opacity: 0 elements can receive clicks!
  }

  const visibilityInfo: VisibilityInfo = {
    display: css.display,
    visibility: css.visibility,
    opacity: css.opacity,
    isZeroSized: css.isZeroSized,
    isOffScreen: css.isOffScreen,
    visualState,
    visualDescription,
    canReceivePointerEvents: canReceivePointer,
  };

  // 3. Ancestor blocking inspection
  let ancestorIsBlocked = false;
  let ancestorSelector: string | undefined;
  let ancestorReason: string | undefined;

  if (parent.inDisabledFieldset) {
    ancestorIsBlocked = true;
    ancestorReason = 'Enclosing <fieldset> has disabled attribute.';
    ancestorSelector = 'fieldset[disabled]';
  } else if (parent.inertAncestor) {
    ancestorIsBlocked = true;
    ancestorReason = 'Ancestor has "inert" attribute.';
    const inertIssue = parent.ancestorIssues.find((i) => i.issueType === 'inert');
    if (inertIssue) {
      ancestorSelector = `${inertIssue.tagName.toLowerCase()}${inertIssue.id ? `#${inertIssue.id}` : ''}`;
    }
  } else if (parent.pointerEventsAncestor) {
    ancestorIsBlocked = true;
    ancestorReason = `Ancestor <${blockingAncestorSelector || 'container'}> has pointer-events: none.`;
    ancestorSelector = blockingAncestorSelector;
  } else if (parent.hiddenAncestor) {
    ancestorIsBlocked = true;
    ancestorReason = 'Ancestor container is hidden.';
    const hiddenIssue = parent.ancestorIssues.find((i) => i.issueType === 'hidden');
    if (hiddenIssue) {
      ancestorSelector = `${hiddenIssue.tagName.toLowerCase()}${hiddenIssue.id ? `#${hiddenIssue.id}` : ''}`;
    }
  }

  // 4. Interaction Chain: Append target element as the leaf node
  const targetSelector = buildSelector(element);
  const interactionChain: AncestorChainNode[] = [
    ...parent.interactionChain,
    {
      tagName: element.tagName.toUpperCase(),
      selector: targetSelector,
      isBlocking: html.disabledAttr || isSelfDirect || html.inertAttr,
      blockingReason: html.disabledAttr
        ? 'disabled attribute'
        : isSelfDirect
        ? 'pointer-events: none'
        : html.inertAttr
        ? 'inert attribute'
        : undefined,
    },
  ];

  // 5. Event listener detection
  const hasInlineClick = element.hasAttribute('onclick');
  const observableFrameworkHandlers: string[] = [];

  if (hasInlineClick) {
    observableFrameworkHandlers.push('inline onclick');
  }

  const elKeys = Object.keys(element);
  const reactProps = elKeys.find((k) => k.startsWith('__reactProps$') || k.startsWith('__reactFiber$'));
  if (reactProps) {
    observableFrameworkHandlers.push('React SyntheticEvent system');
  }
  const vueData = elKeys.find((k) => k.startsWith('__vue'));
  if (vueData) {
    observableFrameworkHandlers.push('Vue reactive bindings');
  }

  let eventStatusText = 'Click handler: Not deterministically observable';
  if (hasInlineClick) {
    eventStatusText = 'Inline onclick listener declared on element.';
  } else if (observableFrameworkHandlers.length > 0) {
    eventStatusText = `Managed by ${observableFrameworkHandlers.join(', ')}.`;
  }

  // 6. Determine clickability state and primary reason
  let state: InteractionAnalysis['state'] = 'interactive';
  let statusLabel = '🟢 Interactive';
  let primaryReason = 'Element can receive pointer and click events.';
  let canClick = true;

  if (html.disabledAttr || html.disabledProp || parent.inDisabledFieldset) {
    state = 'not_interactive';
    statusLabel = '🔴 Not clickable';
    canClick = false;
    primaryReason = html.disabledAttr
      ? 'HTML "disabled" attribute is present on element.'
      : parent.inDisabledFieldset
      ? 'Parent <fieldset> is disabled.'
      : 'DOM element.disabled property is true.';
  } else if (isSelfDirect) {
    state = 'not_interactive';
    statusLabel = '🔴 Not clickable';
    canClick = false;
    primaryReason = 'CSS "pointer-events: none" applied directly to element.';
  } else if (isAncestorPointerNone) {
    state = 'not_interactive';
    statusLabel = '🔴 Not clickable';
    canClick = false;
    primaryReason = `Ancestor <${blockingAncestorSelector || 'container'}> has "pointer-events: none".`;
  } else if (overlay.isCovered) {
    state = 'not_interactive';
    statusLabel = '🔴 Not clickable';
    canClick = false;
    primaryReason = `Element is covered by <${overlay.coveringElement?.selector || 'overlay'}>.`;
  } else if (html.inertAttr || parent.inertAncestor) {
    state = 'not_interactive';
    statusLabel = '🔴 Not clickable';
    canClick = false;
    primaryReason = html.inertAttr ? 'Element has HTML "inert" attribute.' : 'Ancestor element has "inert" attribute.';
  } else if (css.display === 'none' || css.visibility === 'hidden' || parent.hiddenAncestor) {
    state = 'not_interactive';
    statusLabel = '🔴 Not clickable';
    canClick = false;
    primaryReason = css.display === 'none'
      ? 'Element has display: none.'
      : css.visibility === 'hidden'
      ? 'Element has visibility: hidden.'
      : 'Ancestor container is hidden.';
  } else if (css.isOffScreen) {
    state = 'potentially_blocked';
    statusLabel = '🟡 Potentially blocked';
    canClick = false;
    primaryReason = 'Element is positioned outside the current visible viewport.';
  } else if (css.isZeroSized) {
    state = 'potentially_blocked';
    statusLabel = '🟡 Potentially blocked';
    canClick = false;
    primaryReason = 'Element has 0px dimensions in the layout.';
  } else if (html.ariaDisabled === 'true') {
    state = 'potentially_blocked';
    statusLabel = '🟡 Potentially blocked';
    canClick = true;
    primaryReason = 'Element has aria-disabled="true" (announced as disabled to screen readers).';
  } else if (isZeroOpacity) {
    state = 'potentially_blocked';
    statusLabel = '🟡 Potentially blocked';
    canClick = true;
    primaryReason = 'Element has opacity: 0 (invisible visually, but still receives clicks).';
  }

  // 7. Categorical reasons breakdown (Section 8 of prompt)
  const categoricalReasons: CategoricalInteractionReason[] = [
    {
      name: 'pointer-events: none',
      status: isSelfDirect ? 'Confirmed (Direct)' : isAncestorPointerNone ? 'Confirmed (Ancestor)' : 'No',
      confidence: isSelfDirect || isAncestorPointerNone ? 'confirmed' : 'none',
      detail: isSelfDirect
        ? 'Direct pointer-events: none on element.'
        : isAncestorPointerNone
        ? `Inherited from <${blockingAncestorSelector || 'ancestor'}>.`
        : 'Pointer events are enabled (auto).',
    },
    {
      name: 'overlay detected',
      status: overlay.isCovered ? 'Likely' : 'No',
      confidence: overlay.isCovered ? 'likely' : 'none',
      detail: overlay.isCovered
        ? `Occluded by <${overlay.coveringElement?.selector || 'overlay'}>.`
        : 'No obstructing elements detected above target.',
    },
    {
      name: 'element is off-screen',
      status: css.isOffScreen ? 'Yes' : 'No',
      confidence: css.isOffScreen ? 'likely' : 'none',
      detail: css.isOffScreen
        ? `Coordinates (x: ${css.rect.left}, y: ${css.rect.top}) outside viewport.`
        : 'Element is inside visible viewport.',
    },
    {
      name: 'disabled attribute',
      status: html.disabledAttr ? 'Confirmed' : html.disabledProp ? 'Confirmed (prop)' : 'No',
      confidence: html.disabledAttr || html.disabledProp ? 'confirmed' : 'none',
      detail: html.disabledAttr
        ? 'HTML disabled attribute is present.'
        : html.disabledProp
        ? 'element.disabled property is true.'
        : 'No disabled attribute present.',
    },
    {
      name: 'inert / fieldset',
      status: parent.inDisabledFieldset ? 'Likely (fieldset)' : html.inertAttr || parent.inertAncestor ? 'Confirmed (inert)' : 'No',
      confidence: parent.inDisabledFieldset ? 'likely' : html.inertAttr || parent.inertAncestor ? 'confirmed' : 'none',
      detail: parent.inDisabledFieldset
        ? 'Descendant of a disabled <fieldset>.'
        : html.inertAttr || parent.inertAncestor
        ? 'Marked with inert attribute.'
        : 'Not blocked by inert or fieldset.',
    },
    {
      name: 'visually hidden',
      status: css.display === 'none' ? 'Confirmed (display:none)' : css.visibility === 'hidden' ? 'Confirmed (visibility:hidden)' : isZeroOpacity ? 'Visual only (opacity:0)' : 'No',
      confidence: css.display === 'none' || css.visibility === 'hidden' ? 'confirmed' : isZeroOpacity ? 'possible' : 'none',
      detail: visualDescription,
    },
  ];

  return {
    state,
    statusLabel,
    primaryReason,
    canClick,
    pointerEvents: pointerEventsInfo,
    visibility: visibilityInfo,
    overlay,
    ancestorBlock: {
      isBlocked: ancestorIsBlocked,
      ancestorSelector,
      reason: ancestorReason,
    },
    interactionChain,
    eventListeners: {
      hasInlineClick,
      observableFrameworkHandlers,
      statusText: eventStatusText,
    },
    categoricalReasons,
  };
}
