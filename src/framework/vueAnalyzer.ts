/**
 * Vue Framework Analyzer (v1 interface + future v2 deep inspection stub)
 */
export interface VueStateInspectionResult {
  isVueControlled: boolean;
  componentName?: string;
  stateNotes?: string[];
}

export class VueAnalyzer {
  static inspect(element: HTMLElement): VueStateInspectionResult {
    const keys = Object.keys(element);
    const vueKey = keys.find((k) => k.startsWith('__vue'));
    const hasVueScope = Array.from(element.attributes).some((a) => a.name.startsWith('data-v-'));

    if (!vueKey && !hasVueScope) {
      return { isVueControlled: false };
    }

    return {
      isVueControlled: true,
      componentName: element.tagName.toLowerCase(),
      stateNotes: [
        'Vue component instance / scoped attribute detected.',
        'Deep Vue reactivity inspection slated for v2.',
      ],
    };
  }
}
