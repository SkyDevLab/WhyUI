# WhyUI Architecture Documentation

WhyUI by **SkyDevLab** is built specifically for **Microsoft Edge** and Chromium-based browsers using **Manifest V3** and modern web standards.

```text
WhyUI Extension Architecture
┌────────────────────────────────────────────────────────┐
│ Extension Popup (React + DevTools CSS)                │
│ ┌────────────────────────────────────────────────────┐ │
│ │  Select Element  │ Status │ Explanations │ Report  │ │
│ │  [Inspect Blocking Element] │ Watch Timeline       │ │
│ └────────────────────────────────────────────────────┘ │
└───────────────────────▲────────────────────────────────┘
                        │ chrome.runtime.sendMessage / chrome.storage
┌───────────────────────▼────────────────────────────────┐
│ Background Service Worker (Manifest V3 ServiceWorker)  │
│  - Extension lifecycle management                      │
│  - Active analysis cache (chrome.storage.local)        │
└───────────────────────▲────────────────────────────────┘
                        │ chrome.tabs.sendMessage
┌───────────────────────▼────────────────────────────────┐
│ Webpage / Content Script Pipeline                      │
│                                                        │
│ ┌───────────────────────┐   ┌────────────────────────┐ │
│ │ Element Picker        │   │ In-Page DevTools HUD   │ │
│ │ - Mouse hover overlay │   │ - Floating Shadow DOM  │ │
│ │ - Escape to cancel    │   │ - Draggable Header     │ │
│ │ - Click interception  │   │ - Inspect Blocking Btn │ │
│ └──────────┬────────────┘   └───────────▲────────────┘ │
│            ▼                            │              │
│ ┌───────────────────────────────────────┴────────────┐ │
│ │ Deterministic Analysis Engine                      │ │
│ │  ├── htmlAnalyzer.ts        (attrs, aria, inert)   │ │
│ │  ├── cssAnalyzer.ts         (pointer-events, off)  │ │
│ │  ├── parentAnalyzer.ts      (fieldset, chain)      │ │
│ │  ├── formAnalyzer.ts        (HTML5 constraint)     │ │
│ │  ├── overlayAnalyzer.ts     (9-point coord checks) │ │
│ │  ├── interactionAnalyzer.ts (clickability & score) │ │
│ │  ├── eventAnalyzer.ts       (inline & framework)   │ │
│ │  ├── framework/             (React, Angular, Vue)  │ │
│ │  ├── watcher.ts             (MutationObserver log) │ │
│ │  └── explanationEngine.ts   (Rule-based evaluation)│ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Element Picker (`src/content/elementPicker.ts` & `highlighter.ts`)
- **Non-destructive Isolation**: Highlights elements without permanently altering host DOM or CSS. All highlighter and tooltip nodes are injected into an isolated Shadow Root (`#whyui-highlighter-host`).
- **High Z-Index (`2147483647`)**: Ensures the selection box and tooltip stay above modal dialogs and fixed banners.
- **Capturing Event Listeners**: Intercepts mouse and click events during the capturing phase (`true`) so clicking an element to select it does not trigger navigation or submit forms.
- **Escape Cancellation**: Pressing `Escape` immediately restores standard browsing cursor and cleans up listeners.

### 2. In-Page DevTools HUD (`src/content/inPageHud.ts`)
- **Shadow DOM Isolation**: The floating inspector dock is rendered in its own ShadowRoot (`#whyui-hud-host`), preventing CSS leakage or host page style override.
- **Draggable & Non-Obstructing**: Users can drag the HUD header to freely reposition the panel across the viewport. The HUD also automatically flips position if it detects that it is obstructing the selected element.
- **Inspect Blocking Element Action**: If an overlay is detected covering the target, the HUD presents an `[Inspect Blocking Element]` button that immediately switches inspection to the occluding element.

### 3. Analyzers Pipeline (`src/analyzer/`)
- `interactionAnalyzer.ts`: Coordinates the "Why can't I click?" reasoning. Evaluates pointer interaction, distinguishes direct vs inherited `pointer-events: none`, classifies visual visibility states (`visible`, `hidden_display_none`, `invisible_visibility_hidden`, `transparent_opacity_zero`, `zero_sized`, `off_screen`), and produces a categorical clickability score.
- `htmlAnalyzer.ts`: Evaluates standard form control tags (`<button>`, `<input>`, `<select>`, `<textarea>`, `<option>`, etc.), `disabled`, `aria-disabled`, `readonly`, `hidden`, and `inert`.
- `cssAnalyzer.ts`: Evaluates computed styles: `pointer-events: none`, `display: none`, `visibility: hidden`, `opacity: 0`, zero-sized bounding boxes, and off-screen viewport bounds checks.
- `parentAnalyzer.ts`: Recursively traverses the DOM hierarchy up to the document root to detect:
  - `<fieldset disabled>` cascades (honoring the W3C HTML spec exception for the first `<legend>`).
  - Ancestors with `inert`.
  - Hidden or zero-opacity ancestors.
  - Ancestor `pointer-events: none` with precise element attribution.
  - Builds the complete `Interaction Chain`.
- `overlayAnalyzer.ts`: Performs **9-point coordinate sampling** (`center`, `top-left`, `top-center`, `top-right`, `middle-left`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right`) via `document.elementFromPoint()`. Compares bounding boxes, z-index stacking context, and caches the blocking element for 1-click inspection.
- `formAnalyzer.ts`: Identifies associated forms and evaluates HTML constraint validation (`valueMissing`, `typeMismatch`, `patternMismatch`, `tooShort`, `tooLong`, etc.) across all sibling controls without exposing sensitive values.
- `eventAnalyzer.ts`: Safely detects inline event handlers, framework component markers, and dynamic state mutation flags without invasive code execution.

### 4. Framework Detection Module (`src/framework/`)
- Pluggable framework detector recognizing:
  - **React** (Fiber nodes, React DevTools hooks, synthetic event properties)
  - **Angular** (ng-version, ng-reflect attributes, runtime root elements)
  - **Vue** (Vue DevTools hooks, `data-v-` scoped attributes, vnodes)
  - **jQuery** (global jQuery instances, event data attachments)
- Designed with modular analyzer interfaces (`reactAnalyzer.ts`, `angularAnalyzer.ts`, `vueAnalyzer.ts`, `jqueryAnalyzer.ts`) ready for deep state inspection in version 2.

### 5. Deterministic Explanation Engine (`src/analyzer/explanationEngine.ts`)
- Evaluates the collective analysis through clear, verifiable rules.
- Assigns strict confidence levels:
  - **🔴 Confirmed**: Browser directly enforces the state (e.g. `disabled` attribute, `aria-disabled="true"`, `pointer-events: none`).
  - **🟠 Likely**: Direct structural impediment (e.g. parent `<fieldset disabled>`, overlay occlusion, ancestor `inert`, off-screen placement).
  - **🟡 Possible**: Correlated condition (e.g. invalid required form fields, dynamic JavaScript control).

### 6. Live State Watcher (`src/analyzer/watcher.ts`)
- Utilizes a targeted `MutationObserver` on attributes (`disabled`, `aria-disabled`, `class`, `style`, `inert`, `readonly`) and checks property/style transitions.
- Logs exact timestamps, triggers, and old/new values without polling:
  ```text
  14:32:04 disabled: false → true
  14:32:05 class: btn-active → btn-disabled
  14:32:07 pointer-events: auto → none
  ```
