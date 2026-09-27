import { FrameworkDetection } from '../shared/types';

export interface FrameworkAnalyzer {
  name: 'React' | 'Angular' | 'Vue' | 'jQuery';
  detect(): { detected: boolean; version?: string; details?: string };
}

/**
 * Detects whether the current page uses a major frontend framework.
 */
export function detectFramework(element?: HTMLElement): FrameworkDetection {
  // Check in window object & DOM
  const win = window as any;

  // 1. React detection
  const hasReactHook = Boolean(win.__REACT_DEVTOOLS_GLOBAL_HOOK__);
  const hasReactRoot = Boolean(document.querySelector('[data-reactroot], #root, #app'));
  const hasReactFiber = element
    ? Object.keys(element).some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'))
    : false;
  const anyReactElement = Boolean(
    document.querySelector('*') &&
      Object.keys(document.querySelector('body > *') || {}).some((k) => k.startsWith('__reactFiber$'))
  );

  if (hasReactFiber || (hasReactHook && hasReactRoot) || anyReactElement) {
    return {
      detected: true,
      name: 'React',
      version: win.React?.version || undefined,
      details: 'React DOM / Fiber detected on page.',
      deepInspectionAvailable: false,
    };
  }

  // 2. Angular detection
  const angularVersionEl = document.querySelector('[ng-version]');
  const hasAngularGlobal = Boolean(win.ng || win.getAllAngularRootElements);
  if (angularVersionEl || hasAngularGlobal) {
    const version = angularVersionEl?.getAttribute('ng-version') || undefined;
    return {
      detected: true,
      name: 'Angular',
      version,
      details: version ? `Angular version ${version}` : 'Angular runtime detected.',
      deepInspectionAvailable: false,
    };
  }

  // 3. Vue detection
  const hasVueGlobal = Boolean(win.__VUE__ || win.__VUE_DEVTOOLS_GLOBAL_HOOK__);
  const hasVueAttr = Boolean(document.querySelector('[data-v-app], [data-v-]'));
  const hasVueNode = element ? Object.keys(element).some((k) => k.startsWith('__vue')) : false;

  if (hasVueGlobal || hasVueAttr || hasVueNode) {
    return {
      detected: true,
      name: 'Vue',
      details: 'Vue.js reactive app detected.',
      deepInspectionAvailable: false,
    };
  }

  // 4. jQuery detection
  if (win.jQuery || win.$?.fn?.jquery) {
    const version = win.jQuery?.fn?.jquery || win.$?.fn?.jquery;
    return {
      detected: true,
      name: 'jQuery',
      version,
      details: version ? `jQuery v${version}` : 'jQuery library detected.',
      deepInspectionAvailable: false,
    };
  }

  return {
    detected: false,
    deepInspectionAvailable: false,
  };
}
