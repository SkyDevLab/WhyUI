import { ParentAnalysis, AncestorIssue, AncestorChainNode } from '../shared/types';

/**
 * Checks if target is inside the first <legend> child of the fieldset.
 * According to HTML spec, elements inside the first legend are NOT disabled by <fieldset disabled>.
 */
function isInsideFirstLegendOfFieldset(target: HTMLElement, fieldset: HTMLFieldSetElement): boolean {
  const firstLegend = fieldset.querySelector('legend');
  if (!firstLegend) return false;
  return firstLegend.contains(target);
}

/**
 * Builds a friendly selector for an element (e.g. div#checkout.container)
 */
export function buildSelector(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList);
  const classStr = classes.length > 0 ? `.${classes.slice(0, 2).join('.')}` : '';
  return `${tag}${id}${classStr}`;
}

/**
 * Analyzes the ancestor hierarchy for disabling conditions and pointer-event blocking.
 */
export function analyzeParents(element: HTMLElement): ParentAnalysis {
  let inDisabledFieldset = false;
  let inLegendException = false;
  let inertAncestor = false;
  let hiddenAncestor = false;
  let pointerEventsAncestor = false;

  const ancestorIssues: AncestorIssue[] = [];
  const parentChain: string[] = [];
  const rawChainNodes: AncestorChainNode[] = [];

  let current: HTMLElement | null = element.parentElement;

  while (current && current !== document.documentElement) {
    const tagName = current.tagName.toUpperCase();
    const id = current.id || '';
    const classes = Array.from(current.classList);
    const selector = buildSelector(current);
    const tagLabel = `${tagName}${id ? `#${id}` : ''}${classes.length > 0 ? `.${classes.join('.')}` : ''}`;

    let computed: CSSStyleDeclaration | null = null;
    try {
      computed = window.getComputedStyle(current);
    } catch {
      computed = current.style;
    }

    let hasIssue = false;
    let blockingReason: string | undefined;

    // 1. Fieldset disabled check
    if (tagName === 'FIELDSET' && current.hasAttribute('disabled')) {
      const fieldset = current as HTMLFieldSetElement;
      if (isInsideFirstLegendOfFieldset(element, fieldset)) {
        inLegendException = true;
      } else {
        inDisabledFieldset = true;
        hasIssue = true;
        blockingReason = 'disabled fieldset';
        ancestorIssues.push({
          tagName,
          id: id || undefined,
          classes,
          issueType: 'disabled-fieldset',
          description: `Parent <fieldset${id ? ` id="${id}"` : ''}> has "disabled" attribute. All child form controls (outside first legend) are disabled.`,
        });
      }
    }

    // 2. Inert check
    if (current.hasAttribute('inert') || Boolean((current as any).inert)) {
      inertAncestor = true;
      hasIssue = true;
      blockingReason = blockingReason || 'inert attribute';
      ancestorIssues.push({
        tagName,
        id: id || undefined,
        classes,
        issueType: 'inert',
        description: `Ancestor <${tagLabel}> has "inert" attribute, making all descendants non-interactive.`,
      });
    }

    // 3. Hidden container check (display: none or visibility: hidden)
    if (
      current.hasAttribute('hidden') ||
      (computed && (computed.display === 'none' || computed.visibility === 'hidden'))
    ) {
      hiddenAncestor = true;
      hasIssue = true;
      blockingReason = blockingReason || (computed?.display === 'none' ? 'display: none' : 'visibility: hidden');
      ancestorIssues.push({
        tagName,
        id: id || undefined,
        classes,
        issueType: 'hidden',
        description: `Ancestor <${tagLabel}> is hidden (${computed?.display === 'none' ? 'display: none' : 'visibility: hidden'}).`,
      });
    }

    // 4. Pointer-events none on ancestor
    if (computed && computed.pointerEvents === 'none') {
      pointerEventsAncestor = true;
      hasIssue = true;
      blockingReason = blockingReason || 'pointer-events: none';
      ancestorIssues.push({
        tagName,
        id: id || undefined,
        classes,
        issueType: 'pointer-events-none',
        description: `Ancestor <${tagLabel}> has "pointer-events: none", blocking clicks to children.`,
      });
    }

    parentChain.push(hasIssue ? `${tagLabel} [AFFECTED]` : tagLabel);

    rawChainNodes.push({
      tagName,
      selector,
      isBlocking: hasIssue,
      blockingReason,
    });

    current = current.parentElement;
  }

  // Chain ordered from root (body) down to immediate parent
  const interactionChain = [...rawChainNodes].reverse();

  return {
    inDisabledFieldset,
    inLegendException,
    inertAncestor,
    hiddenAncestor,
    pointerEventsAncestor,
    ancestorIssues,
    parentChain,
    interactionChain,
  };
}
