/**
 * Angular Framework Analyzer (v1 interface + future v2 deep inspection stub)
 */
export interface AngularStateInspectionResult {
  isAngularControlled: boolean;
  componentName?: string;
  stateNotes?: string[];
}

export class AngularAnalyzer {
  static inspect(element: HTMLElement): AngularStateInspectionResult {
    const hasNgReflect = Array.from(element.attributes).some((a) => a.name.startsWith('ng-reflect-'));
    const isNgComponent = element.tagName.includes('-') && element.hasAttribute('ng-version');

    if (!hasNgReflect && !isNgComponent) {
      return { isAngularControlled: false };
    }

    return {
      isAngularControlled: true,
      componentName: element.tagName.toLowerCase(),
      stateNotes: [
        'Angular binding attributes detected on element.',
        'Deep Angular state inspection slated for v2.',
      ],
    };
  }
}
