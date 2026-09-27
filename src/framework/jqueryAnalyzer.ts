/**
 * jQuery Framework Analyzer (v1 interface + future v2 deep inspection stub)
 */
export interface JQueryInspectionResult {
  hasJQueryData: boolean;
  events?: string[];
  notes?: string[];
}

export class JQueryAnalyzer {
  static inspect(element: HTMLElement): JQueryInspectionResult {
    const win = window as any;
    const $ = win.jQuery || win.$;

    if (!$ || typeof $ !== 'function') {
      return { hasJQueryData: false };
    }

    try {
      const data = $._data ? $._data(element, 'events') : undefined;
      const eventKeys = data ? Object.keys(data) : [];

      return {
        hasJQueryData: Boolean(data),
        events: eventKeys,
        notes: eventKeys.length > 0
          ? [`jQuery event listeners attached: ${eventKeys.join(', ')}`]
          : ['Element inspected via jQuery.'],
      };
    } catch {
      return { hasJQueryData: false };
    }
  }
}
