import { EventAnalysis } from '../shared/types';

/**
 * Safely inspects observable JavaScript and framework event indicators without invasive injection.
 */
export function analyzeEvents(element: HTMLElement): EventAnalysis {
  const details: string[] = [];
  let hasInlineHandlers = false;
  let hasDynamicMutation = false;
  let dynamicallyControlled = false;

  // 1. Check for standard inline event handlers
  const inlineEventAttributes = [
    'onclick',
    'onmousedown',
    'onmouseup',
    'onpointerdown',
    'onkeydown',
    'onkeyup',
    'onchange',
    'onsubmit',
  ];

  const foundInlineHandlers: string[] = [];
  for (const attr of inlineEventAttributes) {
    if (element.hasAttribute(attr)) {
      foundInlineHandlers.push(attr);
    }
  }

  if (foundInlineHandlers.length > 0) {
    hasInlineHandlers = true;
    dynamicallyControlled = true;
    details.push(`Element has inline event handler(s): ${foundInlineHandlers.join(', ')}`);
  }

  // 2. Check for Framework event hooks on the DOM node
  const keys = Object.keys(element);
  const reactPropsKey = keys.find(
    (k) => k.startsWith('__reactProps$') || k.startsWith('__reactFiber$') || k.startsWith('__reactEvents$')
  );
  if (reactPropsKey) {
    dynamicallyControlled = true;
    details.push('Element is attached to a React synthetic event system / Fiber node.');
  }

  const vueProp = keys.find((k) => k.startsWith('__vue') || k === '__vnode');
  if (vueProp) {
    dynamicallyControlled = true;
    details.push('Element is bound to a Vue component reactive state.');
  }

  // 3. Dynamic state attributes common in modern SPAs (Radix UI, Headless UI, Ark, etc.)
  const stateAttrs = ['data-state', 'data-disabled', 'data-loading', 'aria-busy', 'data-status'];
  for (const sa of stateAttrs) {
    if (element.hasAttribute(sa)) {
      const val = element.getAttribute(sa);
      details.push(`Dynamic state attribute present: ${sa}="${val}"`);
      if (val === 'disabled' || val === 'true' || val === 'loading') {
        dynamicallyControlled = true;
      }
    }
  }

  // 4. Check dataset marker if tracked dynamically by WhyUI Watcher
  if ((element as any).__whyui_mutated) {
    hasDynamicMutation = true;
    dynamicallyControlled = true;
    details.push('Element state or attributes have been modified dynamically after page load.');
  }

  return {
    hasInlineHandlers,
    hasDynamicMutation,
    dynamicallyControlled,
    details,
  };
}
