import { ElementHighlighter } from './highlighter';

export interface ElementPickerCallbacks {
  onSelect: (element: HTMLElement) => void;
  onCancel: () => void;
}

export class ElementPicker {
  private highlighter: ElementHighlighter | null = null;
  private overlay: HTMLElement | null = null;
  private isActive = false;
  private callbacks: ElementPickerCallbacks | null = null;
  private currentHovered: HTMLElement | null = null;

  constructor() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
  }

  start(callbacks: ElementPickerCallbacks) {
    if (this.isActive) {
      this.stop();
    }

    this.isActive = true;
    this.callbacks = callbacks;
    this.highlighter = new ElementHighlighter();

    // Create a full-screen transparent capture overlay.
    // In Chromium/Edge, disabled form controls (<button disabled>, <input disabled>, etc.)
    // completely suppress click/pointer events at the browser hit-testing phase.
    // Placing this transparent capture overlay above the page ensures all mouse/click
    // interactions are reliably caught by the extension, allowing any disabled element
    // to be selected and analyzed.
    this.overlay = document.createElement('div');
    this.overlay.id = 'whyui-picker-overlay';
    this.overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483646 !important;
      cursor: crosshair !important;
      background: transparent !important;
      pointer-events: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      user-select: none !important;
    `;

    document.documentElement.appendChild(this.overlay);

    // Bind listeners to overlay
    this.overlay.addEventListener('mousemove', this.handleMouseMove, true);
    this.overlay.addEventListener('click', this.handleClick, true);
    this.overlay.addEventListener('mousedown', this.handleMouseDown, true);
    this.overlay.addEventListener('wheel', this.handleWheel, { passive: false });
    this.overlay.addEventListener('contextmenu', this.handleContextMenu, true);

    // Also bind to window as fallback and for keyboard/scroll
    window.addEventListener('mousemove', this.handleMouseMove, true);
    window.addEventListener('click', this.handleClick, true);
    window.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('scroll', this.handleScroll, true);

    document.documentElement.style.cursor = 'crosshair';
  }

  stop() {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.overlay) {
      this.overlay.removeEventListener('mousemove', this.handleMouseMove, true);
      this.overlay.removeEventListener('click', this.handleClick, true);
      this.overlay.removeEventListener('mousedown', this.handleMouseDown, true);
      this.overlay.removeEventListener('wheel', this.handleWheel);
      this.overlay.removeEventListener('contextmenu', this.handleContextMenu, true);
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;
    }

    window.removeEventListener('mousemove', this.handleMouseMove, true);
    window.removeEventListener('click', this.handleClick, true);
    window.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('scroll', this.handleScroll, true);

    document.documentElement.style.cursor = '';

    if (this.highlighter) {
      this.highlighter.destroy();
      this.highlighter = null;
    }
    this.currentHovered = null;
    this.callbacks = null;
  }

  private isWhyUIElement(node: Node | null): boolean {
    if (!node) return false;
    let curr: Node | null = node;
    while (curr) {
      if (curr instanceof HTMLElement && (curr.id?.startsWith('whyui-') || curr.tagName.startsWith('WHYUI-'))) {
        return true;
      }
      if (curr instanceof ShadowRoot) {
        const host = curr.host as HTMLElement;
        if (host && (host.id?.startsWith('whyui-') || host.tagName.startsWith('WHYUI-'))) {
          return true;
        }
      }
      curr = curr.parentNode;
    }
    return false;
  }

  private resolveElementAtPoint(x: number, y: number): HTMLElement | null {
    let candidate: HTMLElement | null = null;

    if (typeof document.elementsFromPoint === 'function') {
      const elements = document.elementsFromPoint(x, y);
      for (const el of elements) {
        if (el instanceof HTMLElement && !this.isWhyUIElement(el)) {
          candidate = el;
          break;
        }
      }
    }

    if (!candidate && typeof document.elementFromPoint === 'function') {
      // Temporarily toggle overlay pointer-events to hit-test page beneath
      if (this.overlay) {
        this.overlay.style.pointerEvents = 'none';
      }
      const el = document.elementFromPoint(x, y);
      if (this.overlay) {
        this.overlay.style.pointerEvents = 'auto';
      }
      if (el instanceof HTMLElement && !this.isWhyUIElement(el)) {
        candidate = el;
      }
    }

    if (!candidate) return null;

    // Drill down to the deepest leaf element at (x, y) to support elements with pointer-events: none
    return this.findDeepestElementAtPoint(candidate, x, y);
  }

  private findDeepestElementAtPoint(root: HTMLElement, x: number, y: number): HTMLElement {
    try {
      const children = Array.from(root.children) as HTMLElement[];
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child instanceof HTMLElement && !this.isWhyUIElement(child)) {
          const rect = child.getBoundingClientRect();
          if (
            rect.width > 0 &&
            rect.height > 0 &&
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
          ) {
            return this.findDeepestElementAtPoint(child, x, y);
          }
        }
      }
    } catch {
      // Fallback to current root if access is restricted
    }
    return root;
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isActive || !this.highlighter) return;

    const x = e.clientX;
    const y = e.clientY;
    const target = this.resolveElementAtPoint(x, y);

    if (!target || !(target instanceof HTMLElement)) {
      this.highlighter.clear();
      this.currentHovered = null;
      return;
    }

    if (this.isWhyUIElement(target)) {
      return;
    }

    this.currentHovered = target;
    this.highlighter.highlight(target);
  }

  private handleClick(e: MouseEvent) {
    if (!this.isActive) return;

    // Prevent page from navigating or submitting
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const selected = this.currentHovered || this.resolveElementAtPoint(e.clientX, e.clientY);
    const onSelect = this.callbacks?.onSelect;

    this.stop();

    if (selected && onSelect) {
      onSelect(selected);
    }
  }

  private handleMouseDown(e: MouseEvent) {
    if (!this.isActive) return;
    // Prevent text selection or page drag during picking
    e.preventDefault();
    e.stopPropagation();
  }

  private handleContextMenu(e: MouseEvent) {
    if (!this.isActive) return;
    // Right click cancels selection
    e.preventDefault();
    e.stopPropagation();
    const onCancel = this.callbacks?.onCancel;
    this.stop();
    if (onCancel) {
      onCancel();
    }
  }

  private handleWheel(e: WheelEvent) {
    if (!this.isActive) return;
    // Forward wheel scrolling so the user can scroll the document to pick elements
    window.scrollBy({
      left: e.deltaX,
      top: e.deltaY,
      behavior: 'auto',
    });
    if (this.highlighter && this.currentHovered) {
      this.highlighter.highlight(this.currentHovered);
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.isActive) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      const onCancel = this.callbacks?.onCancel;
      this.stop();
      if (onCancel) {
        onCancel();
      }
    }
  }

  private handleScroll() {
    if (this.isActive && this.highlighter && this.currentHovered) {
      this.highlighter.highlight(this.currentHovered);
    }
  }
}
