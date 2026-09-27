/**
 * Shadow DOM-isolated highlighter overlay for element picker.
 */
export class ElementHighlighter {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private box: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const existing = document.getElementById('whyui-highlighter-host');
    if (existing) {
      existing.remove();
    }

    this.host = document.createElement('div');
    this.host.id = 'whyui-highlighter-host';
    this.host.style.position = 'fixed';
    this.host.style.zIndex = '2147483647';
    this.host.style.top = '0';
    this.host.style.left = '0';
    this.host.style.width = '0';
    this.host.style.height = '0';
    this.host.style.pointerEvents = 'none';

    this.shadow = this.host.attachShadow({ mode: 'open' });

    // Styles for highlighter and tooltip
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        pointer-events: none;
      }
      .whyui-box {
        position: fixed;
        border: 2px solid #06b6d4;
        background-color: rgba(6, 182, 212, 0.18);
        border-radius: 4px;
        box-shadow: 0 0 12px rgba(6, 182, 212, 0.4), inset 0 0 8px rgba(6, 182, 212, 0.25);
        pointer-events: none;
        transition: all 0.05s ease-out;
        z-index: 2147483647;
        box-sizing: border-box;
      }
      .whyui-tooltip {
        position: fixed;
        background: #0f172a;
        color: #f8fafc;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 11px;
        line-height: 1.4;
        padding: 5px 9px;
        border-radius: 6px;
        border: 1px solid #334155;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
        pointer-events: none;
        z-index: 2147483647;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .tag {
        color: #38bdf8;
        font-weight: 700;
        text-transform: uppercase;
      }
      .id {
        color: #fbbf24;
      }
      .classes {
        color: #34d399;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dims {
        color: #94a3b8;
        border-left: 1px solid #334155;
        padding-left: 6px;
        font-size: 10px;
      }
    `;

    this.box = document.createElement('div');
    this.box.className = 'whyui-box';
    this.box.style.display = 'none';

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'whyui-tooltip';
    this.tooltip.style.display = 'none';

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.box);
    this.shadow.appendChild(this.tooltip);

    document.documentElement.appendChild(this.host);
  }

  highlight(element: HTMLElement) {
    if (!this.box || !this.tooltip) return;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.clear();
      return;
    }

    // Position highlight box
    this.box.style.display = 'block';
    this.box.style.top = `${rect.top}px`;
    this.box.style.left = `${rect.left}px`;
    this.box.style.width = `${rect.width}px`;
    this.box.style.height = `${rect.height}px`;

    // Tooltip content
    const tagName = element.tagName.toUpperCase();
    const id = element.id ? `#${element.id}` : '';
    const classList = Array.from(element.classList);
    const classes = classList.length > 0 ? `.${classList.slice(0, 3).join('.')}` : '';
    const dims = `${Math.round(rect.width)} × ${Math.round(rect.height)} px`;

    this.tooltip.innerHTML = `
      <span class="tag">${tagName}</span>
      ${id ? `<span class="id">${id}</span>` : ''}
      ${classes ? `<span class="classes">${classes}</span>` : ''}
      <span class="dims">${dims}</span>
    `;

    // Position tooltip: above element if space allows, otherwise below
    this.tooltip.style.display = 'flex';
    const tooltipRect = this.tooltip.getBoundingClientRect();
    let top = rect.top - (tooltipRect.height || 26) - 6;
    let left = rect.left;

    if (top < 8) {
      // Show below
      top = rect.bottom + 6;
    }

    // Keep within horizontal bounds
    const maxLeft = (window.innerWidth || 1000) - (tooltipRect.width || 200) - 10;
    left = Math.max(8, Math.min(left, maxLeft));

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }

  clear() {
    if (this.box) this.box.style.display = 'none';
    if (this.tooltip) this.tooltip.style.display = 'none';
  }

  destroy() {
    this.clear();
    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }
    this.host = null;
    this.shadow = null;
    this.box = null;
    this.tooltip = null;
  }
}
