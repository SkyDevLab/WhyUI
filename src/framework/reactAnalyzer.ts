/**
 * React Framework Analyzer (v1 interface + future v2 deep inspection stub)
 */
export interface ReactStateInspectionResult {
  isReactControlled: boolean;
  componentName?: string;
  props?: Record<string, any>;
  stateNotes?: string[];
}

export class ReactAnalyzer {
  static inspect(element: HTMLElement): ReactStateInspectionResult {
    const keys = Object.keys(element);
    const fiberKey = keys.find((k) => k.startsWith('__reactFiber$'));
    const propsKey = keys.find((k) => k.startsWith('__reactProps$'));

    if (!fiberKey && !propsKey) {
      return { isReactControlled: false };
    }

    const fiber = fiberKey ? (element as any)[fiberKey] : null;
    let componentName: string | undefined;

    if (fiber) {
      let curr = fiber;
      while (curr && !componentName) {
        if (typeof curr.type === 'function') {
          componentName = curr.type.displayName || curr.type.name;
        } else if (typeof curr.type === 'string') {
          // host element
        }
        curr = curr.return;
      }
    }

    return {
      isReactControlled: true,
      componentName: componentName || 'UnknownReactComponent',
      stateNotes: [
        'React Fiber node detected.',
        'Deep state extraction slated for v2.',
      ],
    };
  }
}
