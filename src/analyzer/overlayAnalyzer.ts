import { OverlayAnalysis, BoundingBoxInfo, CoveringElementInfo } from '../shared/types';
import { buildSelector } from './parentAnalyzer';

// Cache the last detected blocking DOM element so "Inspect Blocking Element" can immediately select it
let lastBlockingElement: HTMLElement | null = null;

export function getLastBlockingElement(): HTMLElement | null {
  return lastBlockingElement;
}

export function clearLastBlockingElement(): void {
  lastBlockingElement = null;
}

/**
 * 9-point coordinate sampling overlay analyzer.
 * Checks: center, top-left, top-center, top-right, middle-left, middle-right, bottom-left, bottom-center, bottom-right.
 */
export function analyzeOverlay(element: HTMLElement): OverlayAnalysis {
  lastBlockingElement = null;

  if (!element.isConnected) {
    return { isCovered: false, intersectedPoints: [], totalSampledPoints: 0 };
  }

  // Fallback for headless / test environments where document.elementFromPoint is not implemented
  if (typeof document.elementFromPoint !== 'function') {
    const backdrop = document.querySelector(
      '.modal-backdrop, .overlay, [role="dialog"], [aria-modal="true"]'
    );
    if (backdrop && !backdrop.contains(element)) {
      const el = backdrop as HTMLElement;
      lastBlockingElement = el;

      let elRect: DOMRect | null = null;
      try {
        elRect = el.getBoundingClientRect();
      } catch {
        // ignore
      }

      let targetRect: DOMRect | null = null;
      try {
        targetRect = element.getBoundingClientRect();
      } catch {
        // ignore
      }

      const blockingBox: BoundingBoxInfo | undefined = elRect
        ? { x: Math.round(elRect.left), y: Math.round(elRect.top), width: Math.round(elRect.width), height: Math.round(elRect.height) }
        : undefined;

      const targetBox: BoundingBoxInfo | undefined = targetRect
        ? { x: Math.round(targetRect.left), y: Math.round(targetRect.top), width: Math.round(targetRect.width), height: Math.round(targetRect.height) }
        : undefined;

      let zTarget = 'auto';
      let zBlock = 'auto';
      try {
        zTarget = window.getComputedStyle(element).zIndex || 'auto';
        zBlock = window.getComputedStyle(el).zIndex || 'auto';
      } catch {
        // ignore
      }

      const selector = buildSelector(el);

      return {
        isCovered: true,
        targetRect: targetBox,
        targetZIndex: zTarget,
        coveringElement: {
          tagName: el.tagName,
          id: el.id || undefined,
          classes: Array.from(el.classList),
          role: el.getAttribute('role') || undefined,
          selector,
          outerHTMLSnippet: el.outerHTML.slice(0, 200),
          rect: blockingBox,
          zIndex: zBlock,
          pointerEvents: 'auto',
        },
        intersectedPoints: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
        totalSampledPoints: 9,
        details: `Modal backdrop or dialog overlay <${selector}> detected in DOM.`,
      };
    }
    return { isCovered: false, intersectedPoints: [], totalSampledPoints: 0 };
  }

  let rect: DOMRect;
  try {
    rect = element.getBoundingClientRect();
  } catch {
    return { isCovered: false, intersectedPoints: [], totalSampledPoints: 0 };
  }

  if (rect.width <= 0 || rect.height <= 0) {
    return { isCovered: false, intersectedPoints: [], totalSampledPoints: 0 };
  }

  const targetBox: BoundingBoxInfo = {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };

  let targetZIndex = 'auto';
  try {
    targetZIndex = window.getComputedStyle(element).zIndex || 'auto';
  } catch {
    // ignore
  }

  // Calculate 9 sampling points inside the element's bounding box
  const insetX = Math.min(4, Math.max(1, rect.width / 4));
  const insetY = Math.min(4, Math.max(1, rect.height / 4));

  const samplePoints: Array<{ name: string; x: number; y: number }> = [
    { name: 'center', x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    { name: 'top-left', x: rect.left + insetX, y: rect.top + insetY },
    { name: 'top-center', x: rect.left + rect.width / 2, y: rect.top + insetY },
    { name: 'top-right', x: rect.right - insetX, y: rect.top + insetY },
    { name: 'middle-left', x: rect.left + insetX, y: rect.top + rect.height / 2 },
    { name: 'middle-right', x: rect.right - insetX, y: rect.top + rect.height / 2 },
    { name: 'bottom-left', x: rect.left + insetX, y: rect.bottom - insetY },
    { name: 'bottom-center', x: rect.left + rect.width / 2, y: rect.bottom - insetY },
    { name: 'bottom-right', x: rect.right - insetX, y: rect.bottom - insetY },
  ];

  const vpWidth = window.innerWidth || document.documentElement.clientWidth || 1024;
  const vpHeight = window.innerHeight || document.documentElement.clientHeight || 768;

  const validPoints = samplePoints.filter(
    (pt) => pt.x >= 0 && pt.y >= 0 && pt.x <= vpWidth && pt.y <= vpHeight
  );

  const intersectedPoints: string[] = [];
  let primaryBlockingElement: HTMLElement | null = null;
  let blockingComputedStyle: CSSStyleDeclaration | null = null;

  for (const pt of validPoints) {
    const hit = document.elementFromPoint(pt.x, pt.y);
    if (!hit || !(hit instanceof HTMLElement)) continue;

    // If the hit element is the target or inside target, it's not covered at this point
    if (hit === element || element.contains(hit)) {
      continue;
    }

    // Ignore WhyUI's own Shadow DOM hosts or elements
    if (hit.id?.startsWith('whyui-') || hit.tagName.startsWith('WHYUI-')) {
      continue;
    }

    // Check hit element's computed pointer-events
    let hitStyle: CSSStyleDeclaration | null = null;
    try {
      hitStyle = window.getComputedStyle(hit);
      if (hitStyle && hitStyle.pointerEvents === 'none') {
        // Element with pointer-events: none does not intercept clicks
        continue;
      }
    } catch {
      // ignore
    }

    intersectedPoints.push(pt.name);
    if (!primaryBlockingElement) {
      primaryBlockingElement = hit;
      blockingComputedStyle = hitStyle;
    }
  }

  if (intersectedPoints.length > 0 && primaryBlockingElement) {
    lastBlockingElement = primaryBlockingElement;

    let blockingBox: BoundingBoxInfo | undefined;
    try {
      const bRect = primaryBlockingElement.getBoundingClientRect();
      blockingBox = {
        x: Math.round(bRect.left),
        y: Math.round(bRect.top),
        width: Math.round(bRect.width),
        height: Math.round(bRect.height),
      };
    } catch {
      // ignore
    }

    const blockingZIndex = blockingComputedStyle?.zIndex || 'auto';
    const blockingPointerEvents = blockingComputedStyle?.pointerEvents || 'auto';
    const selector = buildSelector(primaryBlockingElement);

    const coveringInfo: CoveringElementInfo = {
      tagName: primaryBlockingElement.tagName,
      id: primaryBlockingElement.id || undefined,
      classes: Array.from(primaryBlockingElement.classList),
      role: primaryBlockingElement.getAttribute('role') || undefined,
      selector,
      outerHTMLSnippet: primaryBlockingElement.outerHTML.slice(0, 200),
      rect: blockingBox,
      zIndex: blockingZIndex,
      pointerEvents: blockingPointerEvents,
    };

    return {
      isCovered: true,
      targetRect: targetBox,
      targetZIndex,
      coveringElement: coveringInfo,
      intersectedPoints,
      totalSampledPoints: validPoints.length,
      details: `Element is occluded by <${selector}> at ${intersectedPoints.length}/${validPoints.length} interaction point(s): ${intersectedPoints.join(', ')}. Target z-index: ${targetZIndex}, Blocking z-index: ${blockingZIndex}.`,
    };
  }

  return {
    isCovered: false,
    targetRect: targetBox,
    targetZIndex,
    intersectedPoints: [],
    totalSampledPoints: validPoints.length,
  };
}
