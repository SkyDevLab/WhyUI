import { HtmlAnalysis, ElementSummary } from '../shared/types';

const FORM_CONTROL_TAGS = new Set([
  'BUTTON',
  'INPUT',
  'SELECT',
  'TEXTAREA',
  'OPTION',
  'OPTGROUP',
  'FIELDSET',
]);

/**
 * Extracts element summary info (tag, id, classes, attributes, outerHTML snippet).
 */
export function extractElementSummary(element: Element): ElementSummary {
  const tagName = element.tagName;
  const id = element.id || '';
  const classes = Array.from(element.classList);
  const role = element.getAttribute('role');

  const attributes: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attributes[attr.name] = attr.value;
  }

  // Text preview (trimmed and max 60 chars)
  const rawText = element.textContent || '';
  const textPreview = rawText.replace(/\s+/g, ' ').trim().slice(0, 60);

  // Selector generator
  let selector = tagName.toLowerCase();
  if (id) {
    selector += `#${id}`;
  } else if (classes.length > 0) {
    selector += `.${classes.slice(0, 2).join('.')}`;
  }

  return {
    tagName,
    id,
    classes,
    role,
    attributes,
    outerHTML: element.outerHTML.slice(0, 300),
    textPreview,
    selector,
  };
}

/**
 * Analyzes HTML level disabled and non-interactive attributes.
 */
export function analyzeHtml(element: HTMLElement): HtmlAnalysis {
  const tagName = element.tagName.toUpperCase();
  const id = element.id || '';
  const classes = Array.from(element.classList);
  const isStandardFormControl = FORM_CONTROL_TAGS.has(tagName);

  const disabledAttr = element.hasAttribute('disabled');
  // Form controls have .disabled boolean property
  const disabledProp = 'disabled' in element ? Boolean((element as any).disabled) : false;
  const ariaDisabled = element.getAttribute('aria-disabled');
  const readonlyAttr = element.hasAttribute('readonly') || Boolean((element as any).readOnly);
  const hiddenAttr = element.hasAttribute('hidden') || Boolean((element as any).hidden);
  const inertAttr = element.hasAttribute('inert') || Boolean((element as any).inert);
  const typeAttr = element.getAttribute('type');
  const roleAttr = element.getAttribute('role');

  const allAttributes: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    allAttributes[attr.name] = attr.value;
  }

  return {
    tagName,
    id,
    classes,
    disabledAttr,
    disabledProp,
    ariaDisabled,
    readonlyAttr,
    hiddenAttr,
    inertAttr,
    isStandardFormControl,
    typeAttr,
    roleAttr,
    allAttributes,
  };
}
