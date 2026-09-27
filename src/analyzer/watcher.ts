import { StateChangeEvent } from '../shared/types';

export class ElementWatcher {
  private element: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private onStateChange: (event: StateChangeEvent) => void;
  private lastDisabledProp: boolean | null = null;
  private lastPointerEvents: string | null = null;
  private pollInterval: number | null = null;

  constructor(onStateChange: (event: StateChangeEvent) => void) {
    this.onStateChange = onStateChange;
  }

  start(element: HTMLElement) {
    this.stop();
    this.element = element;

    // Record baseline property values if applicable
    if ('disabled' in element) {
      this.lastDisabledProp = Boolean((element as any).disabled);
    }

    try {
      this.lastPointerEvents = window.getComputedStyle(element).pointerEvents || 'auto';
    } catch {
      this.lastPointerEvents = element.style.pointerEvents || 'auto';
    }

    // Initialize MutationObserver for attributes
    this.observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName) {
          const attr = m.attributeName;
          const oldValue = m.oldValue;
          const newValue = this.element?.getAttribute(attr) ?? null;

          if (oldValue !== newValue) {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];

            if (this.element) {
              (this.element as any).__whyui_mutated = true;
            }

            let trigger = `DOM attribute "${attr}" changed`;
            if (attr === 'disabled') {
              trigger = `disabled: ${oldValue ?? 'null'} → ${newValue ?? 'null'}`;
            } else if (attr === 'class') {
              trigger = `class: ${oldValue || 'none'} → ${newValue || 'none'}`;
            }

            this.onStateChange({
              timestamp: timeStr,
              type: 'attribute',
              attributeName: attr,
              oldValue,
              newValue,
              trigger,
            });
          }
        }
      }

      // Check property and pointer-events transitions
      this.checkStateTransitions();
    });

    this.observer.observe(element, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [
        'disabled',
        'aria-disabled',
        'class',
        'style',
        'inert',
        'readonly',
        'hidden',
        'data-state',
        'data-disabled',
      ],
    });
  }

  private checkStateTransitions() {
    if (!this.element) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    // 1. Check disabled DOM property
    if ('disabled' in this.element) {
      const currentProp = Boolean((this.element as any).disabled);
      if (this.lastDisabledProp !== null && this.lastDisabledProp !== currentProp) {
        (this.element as any).__whyui_mutated = true;

        const oldVal = String(this.lastDisabledProp);
        const newVal = String(currentProp);
        this.lastDisabledProp = currentProp;

        this.onStateChange({
          timestamp: timeStr,
          type: 'property',
          attributeName: 'disabled',
          oldValue: oldVal,
          newValue: newVal,
          trigger: `disabled: ${oldVal} → ${newVal}`,
        });
      }
    }

    // 2. Check pointer-events computed style
    try {
      const currentPe = window.getComputedStyle(this.element).pointerEvents || 'auto';
      if (this.lastPointerEvents !== null && this.lastPointerEvents !== currentPe) {
        (this.element as any).__whyui_mutated = true;
        const oldPe = this.lastPointerEvents;
        this.lastPointerEvents = currentPe;

        this.onStateChange({
          timestamp: timeStr,
          type: 'interaction',
          attributeName: 'pointer-events',
          oldValue: oldPe,
          newValue: currentPe,
          trigger: `pointer-events: ${oldPe} → ${currentPe}`,
        });
      }
    } catch {
      // ignore
    }
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.pollInterval !== null) {
      window.clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.element = null;
    this.lastDisabledProp = null;
    this.lastPointerEvents = null;
  }
}
