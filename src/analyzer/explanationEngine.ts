import {
  Explanation,
  HtmlAnalysis,
  CssAnalysis,
  ParentAnalysis,
  FormAnalysis,
  OverlayAnalysis,
  EventAnalysis,
  PrimaryStatus,
} from '../shared/types';

export interface ExplanationEngineInput {
  html: HtmlAnalysis;
  css: CssAnalysis;
  parent: ParentAnalysis;
  form: FormAnalysis;
  overlay: OverlayAnalysis;
  events: EventAnalysis;
}

export function determinePrimaryStatus(input: ExplanationEngineInput): {
  status: PrimaryStatus;
  isInteractive: boolean;
} {
  const { html, css, parent, overlay } = input;

  if (html.disabledAttr || html.disabledProp || parent.inDisabledFieldset) {
    return { status: 'disabled', isInteractive: false };
  }

  if (html.ariaDisabled === 'true') {
    return { status: 'aria-disabled', isInteractive: false };
  }

  if (
    css.display === 'none' ||
    css.visibility === 'hidden' ||
    css.visibility === 'collapse' ||
    parent.hiddenAncestor
  ) {
    return { status: 'hidden', isInteractive: false };
  }

  if (overlay.isCovered) {
    return { status: 'covered', isInteractive: false };
  }

  if (
    css.pointerEvents === 'none' ||
    parent.inertAncestor ||
    parent.pointerEventsAncestor ||
    html.inertAttr
  ) {
    return { status: 'non-interactive', isInteractive: false };
  }

  return { status: 'enabled', isInteractive: true };
}

/**
 * Deterministic rule-based explanation engine.
 */
export function generateExplanations(input: ExplanationEngineInput): Explanation[] {
  const explanations: Explanation[] = [];
  const { html, css, parent, form, overlay, events } = input;

  // 1. CONFIRMED: HTML disabled attribute or property
  if (html.disabledAttr || (html.isStandardFormControl && html.disabledProp)) {
    const evidence: string[] = [];
    if (html.disabledAttr) {
      evidence.push(`Attribute "disabled" is set on <${html.tagName.toLowerCase()}>.`);
    }
    if (html.disabledProp) {
      evidence.push('DOM property element.disabled evaluates to true.');
    }

    explanations.push({
      id: 'html-disabled-attr',
      severity: 'error',
      confidence: 'confirmed',
      category: 'html',
      title: 'HTML "disabled" attribute is present',
      description: 'The browser natively blocks all click, focus, and form submission events.',
      evidence,
    });
  }

  // 2. CONFIRMED: aria-disabled="true"
  if (html.ariaDisabled === 'true') {
    explanations.push({
      id: 'aria-disabled-true',
      severity: 'warning',
      confidence: 'confirmed',
      category: 'html',
      title: 'Element has aria-disabled="true"',
      description: 'Element is explicitly marked as disabled for assistive technologies and design systems.',
      evidence: ['aria-disabled="true" attribute is explicitly declared on the element.'],
    });
  }

  // 3. CONFIRMED: HTML inert attribute
  if (html.inertAttr) {
    explanations.push({
      id: 'html-inert-attr',
      severity: 'error',
      confidence: 'confirmed',
      category: 'html',
      title: 'Element has HTML "inert" attribute',
      description: 'The inert attribute makes the element and all its children completely non-interactive and unselectable.',
      evidence: ['inert attribute is present on the element.'],
    });
  }

  // 4. CONFIRMED: HTML readonly attribute
  if (html.readonlyAttr) {
    explanations.push({
      id: 'html-readonly-attr',
      severity: 'warning',
      confidence: 'confirmed',
      category: 'html',
      title: 'Element has "readonly" attribute',
      description: 'Value editing is locked by the browser.',
      evidence: ['readonly attribute is set.'],
    });
  }

  // 5. CONFIRMED: CSS pointer-events: none on the element itself
  if (css.pointerEvents === 'none') {
    explanations.push({
      id: 'css-pointer-events-none',
      severity: 'error',
      confidence: 'confirmed',
      category: 'css',
      title: 'CSS "pointer-events: none"',
      description: 'Element cannot receive mouse, touch, or click events because computed pointer-events is "none".',
      evidence: ['Computed style pointer-events: none directly on element.'],
    });
  }

  // 6. CONFIRMED: CSS display: none / visibility: hidden / collapse on the element itself
  if (css.display === 'none' || css.visibility === 'hidden' || css.visibility === 'collapse') {
    const isDisplayNone = css.display === 'none';
    explanations.push({
      id: 'css-hidden',
      severity: 'error',
      confidence: 'confirmed',
      category: 'css',
      title: isDisplayNone ? 'CSS display: none' : 'CSS visibility: hidden',
      description: isDisplayNone
        ? 'Element is completely removed from the visual layout tree.'
        : 'Element is invisible in the viewport and cannot receive pointer clicks.',
      evidence: [
        `Computed display: ${css.display}`,
        `Computed visibility: ${css.visibility}`,
      ],
    });
  }

  // 7. CONFIRMED / WARNING: CSS opacity: 0
  if (parseFloat(css.opacity) <= 0.02) {
    explanations.push({
      id: 'css-opacity-zero',
      severity: 'warning',
      confidence: 'confirmed',
      category: 'css',
      title: 'CSS opacity is 0',
      description: 'Element is invisible visually (transparent). Note: transparent elements can still receive pointer events unless blocked by pointer-events or overlays.',
      evidence: [`Computed opacity: ${css.opacity}`],
    });
  }

  // 8. LIKELY: Parent <fieldset disabled>
  if (parent.inDisabledFieldset) {
    const evidence = parent.ancestorIssues
      .filter((i) => i.issueType === 'disabled-fieldset')
      .map((i) => i.description);

    explanations.push({
      id: 'parent-fieldset-disabled',
      severity: 'error',
      confidence: 'likely',
      category: 'parent',
      title: 'Parent <fieldset> is disabled',
      description: 'A parent <fieldset> container has the disabled attribute, cascading disabled state to all child controls.',
      evidence: evidence.length > 0 ? evidence : ['Ancestor <fieldset> has "disabled" attribute.'],
    });
  }

  // 9. LIKELY: Ancestor has "inert"
  if (parent.inertAncestor) {
    const evidence = parent.ancestorIssues
      .filter((i) => i.issueType === 'inert')
      .map((i) => i.description);

    explanations.push({
      id: 'parent-inert',
      severity: 'error',
      confidence: 'likely',
      category: 'parent',
      title: 'Ancestor element has "inert" attribute',
      description: 'An ancestor node is marked inert, blocking all user interaction for this subtree.',
      evidence: evidence.length > 0 ? evidence : ['Ancestor has "inert" attribute.'],
    });
  }

  // 10. LIKELY / CONFIRMED: Ancestor has pointer-events: none
  if (parent.pointerEventsAncestor) {
    const blockingIssue = parent.ancestorIssues.find((i) => i.issueType === 'pointer-events-none');
    const sourceLabel = blockingIssue
      ? `<${blockingIssue.tagName.toLowerCase()}${blockingIssue.id ? `#${blockingIssue.id}` : ''}${blockingIssue.classes.length > 0 ? `.${blockingIssue.classes.join('.')}` : ''}>`
      : 'an ancestor';

    const evidence = [
      `Source: ${sourceLabel}`,
      'The selected element inherits pointer-event blocking from an ancestor.',
    ];

    explanations.push({
      id: 'parent-pointer-events-none',
      severity: 'error',
      confidence: 'likely',
      category: 'parent',
      title: 'Ancestor blocks pointer events',
      description: `An ancestor container (${sourceLabel}) has "pointer-events: none", preventing click events from reaching children.`,
      evidence,
    });
  }

  // 11. LIKELY: Ancestor is hidden
  if (parent.hiddenAncestor && css.display !== 'none' && css.visibility !== 'hidden') {
    const evidence = parent.ancestorIssues
      .filter((i) => i.issueType === 'hidden')
      .map((i) => i.description);

    explanations.push({
      id: 'parent-hidden',
      severity: 'error',
      confidence: 'likely',
      category: 'parent',
      title: 'Ancestor container is hidden',
      description: 'An enclosing container has display: none or visibility: hidden.',
      evidence: evidence.length > 0 ? evidence : ['Ancestor container is hidden.'],
    });
  }

  // 12. LIKELY: Overlay covering the element
  if (overlay.isCovered) {
    const cov = overlay.coveringElement;
    const evidence: string[] = [];
    if (cov) {
      evidence.push(`Covering element: <${cov.selector || cov.tagName.toLowerCase()}>`);
      if (cov.rect && overlay.targetRect) {
        evidence.push(`Target coordinates: x = ${overlay.targetRect.x}, y = ${overlay.targetRect.y}, width = ${overlay.targetRect.width}, height = ${overlay.targetRect.height}`);
        evidence.push(`Blocking element: x = ${cov.rect.x}, y = ${cov.rect.y}, width = ${cov.rect.width}, height = ${cov.rect.height}`);
        evidence.push(`Stacking info: Target z-index: ${overlay.targetZIndex || 'auto'}, Blocking z-index: ${cov.zIndex || 'auto'}`);
      }
    }
    if (overlay.intersectedPoints.length > 0) {
      evidence.push(`Intersected interaction point(s): ${overlay.intersectedPoints.join(', ')} (${overlay.intersectedPoints.length}/${overlay.totalSampledPoints} points)`);
    }
    if (overlay.details) {
      evidence.push(overlay.details);
    }

    explanations.push({
      id: 'overlay-intercepting',
      severity: 'error',
      confidence: 'likely',
      category: 'overlay',
      title: 'Element is covered by an overlay',
      description: 'Another DOM element is positioned above this element and intercepting pointer clicks.',
      evidence: evidence.length > 0 ? evidence : ['Element is occluded by another layer.'],
    });
  }

  // 13. LIKELY: Element is off-screen
  if (css.isOffScreen) {
    explanations.push({
      id: 'interaction-off-screen',
      severity: 'warning',
      confidence: 'likely',
      category: 'interaction',
      title: 'Element is outside the viewport',
      description: 'Element exists in the DOM but its bounding rectangle is positioned outside the current visible viewport.',
      evidence: [
        `Bounding box: x = ${css.rect.left}, y = ${css.rect.top}, width = ${css.rect.width}, height = ${css.rect.height}`,
        'The element cannot receive pointer clicks in its current position.',
      ],
    });
  }

  // 14. POSSIBLE: Form validation (Required or invalid fields)
  if (form.hasForm && form.invalidFieldsCount > 0) {
    const invalidList = form.fields.filter((f) => !f.valid);
    const evidence = invalidList.slice(0, 5).map((f) => {
      const fieldName = f.label || f.name || f.id || f.tagName;
      return `${fieldName}: ${f.statusSummary}`;
    });

    if (invalidList.length > 5) {
      evidence.push(`... and ${invalidList.length - 5} more invalid field(s)`);
    }

    explanations.push({
      id: 'form-validation-invalid',
      severity: 'warning',
      confidence: 'possible',
      category: 'form',
      title: `Form contains ${form.invalidFieldsCount} invalid required field(s)`,
      description: 'Web applications commonly disable submit buttons via JavaScript until all required form fields pass validation.',
      evidence,
    });
  }

  // 15. POSSIBLE: Dynamic JavaScript control detected
  if (events.hasDynamicMutation || events.dynamicallyControlled) {
    explanations.push({
      id: 'javascript-dynamic-control',
      severity: 'info',
      confidence: 'possible',
      category: 'javascript',
      title: 'JavaScript dynamic control detected',
      description: 'Element state appears to be controlled dynamically by page scripts or component state.',
      evidence: events.details.length > 0
        ? events.details
        : ['Dynamic state bindings or event listeners were detected.'],
    });
  }

  // 16. POSSIBLE: Cursor not-allowed without disabled
  if (css.cursor === 'not-allowed' && !html.disabledAttr && !html.disabledProp && !parent.inDisabledFieldset) {
    explanations.push({
      id: 'css-cursor-not-allowed',
      severity: 'warning',
      confidence: 'possible',
      category: 'css',
      title: 'CSS cursor: not-allowed applied',
      description: 'The element displays a "not-allowed" cursor, signaling that user interaction is not permitted.',
      evidence: ['Computed style cursor: not-allowed'],
    });
  }

  // 17. POSSIBLE: Zero-sized element
  if (css.isZeroSized && css.display !== 'none' && !parent.hiddenAncestor) {
    explanations.push({
      id: 'css-zero-size',
      severity: 'warning',
      confidence: 'possible',
      category: 'css',
      title: 'Element has 0px dimensions',
      description: 'Element width or height is 0px, making it impossible or difficult to click.',
      evidence: [`Bounding rect: ${css.rect.width}px × ${css.rect.height}px`],
    });
  }

  return explanations;
}
