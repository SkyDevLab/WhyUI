<p align="center">
  <img src="public/icons/icon.png" alt="WhyUI by SkyDevLab" width="160" height="160" style="border-radius: 28px; box-shadow: 0 8px 24px rgba(6, 182, 212, 0.4);" />
</p>

<h1 align="center">WhyUI by SkyDevLab</h1>

<p align="center">
  <strong>Browser UI Interaction Debugger: &ldquo;Why can&apos;t I click this element?&rdquo; &amp; &ldquo;Why is this button disabled?&rdquo;</strong><br />
  A developer-focused Microsoft Edge browser extension that helps frontend developers understand why any web UI element is disabled, unclickable, covered, hidden, readonly, or otherwise not interactive.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://microsoft.com/edge"><img src="https://img.shields.io/badge/Platform-Microsoft%20Edge%20%7C%20Manifest%20V3-0078d7.svg" alt="Platform" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.5-3178c6.svg" alt="TypeScript" /></a>
  <a href="tests/"><img src="https://img.shields.io/badge/Tests-35%20Passing-10b981.svg" alt="Tests" /></a>
</p>

---

## Table of Contents
- [Product Concept](#product-concept)
- [Key Features](#key-features)
- [Interaction Status Engine](#interaction-status-engine)
- [Core User Flow](#core-user-flow)
- [How Element Selection Works](#how-element-selection-works)
- [How Analysis Works](#how-analysis-works)
- [Confidence Levels](#confidence-levels)
- [Technical Information & Reporting](#technical-information--reporting)
- [Installation Guide (Edge Developer Mode)](#installation-guide-edge-developer-mode)
- [Verification Test Suite (Workbench & Tests)](#verification-test-suite-workbench--tests)
- [Development Setup](#development-setup)
- [Architecture](#architecture)
- [Security & Privacy](#security--privacy)
- [Important Limitations](#important-limitations)
- [Future Roadmap](#future-roadmap)

---

## Product Concept

Modern frontend applications are complex: buttons refuse to click, inputs lock up, modals trap pointer events, and submit triggers remain grayed out. Causes span native HTML attributes, cascading CSS properties, parent container constraints, higher z-index overlays, form constraint validation, and dynamic JavaScript framework cycles.

Manual inspection in browser DevTools often requires digging through deep computed style lists, walking parent trees, and toggling z-indexes.

WhyUI solves this by acting as an **automatic, deterministic Browser UI Interaction Debugger**. It analyzes the selected element across multiple technical vectors simultaneously and provides immediate, evidence-based explanations—with zero external network calls or AI hallucinations.

---

## Key Features

- **"Why Can't I Click This Element?" Interaction Debugger**:
  - Classifies elements into **🟢 Interactive**, **🟡 Potentially blocked**, or **🔴 Not clickable**.
  - Evaluates direct disabled state, pointer events, visual visibility, viewport positioning, overlay occlusion, and ancestor constraints.
- **9-Point Coordinate Sampling Overlay Detector**:
  - Samples 9 strategic points (`center`, `top-left`, `top-center`, `top-right`, `middle-left`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right`) using `document.elementFromPoint()`.
  - Compares bounding boxes, z-index values, and positioning to detect full or partial occlusion by backdrops, fixed headers, or transparent overlays.
- **One-Click `[Inspect Blocking Element]` Switch**:
  - When an element is occluded, both the In-Page HUD and toolbar Popup surface an immediate action button to inspect the blocking element with zero friction.
- **Precise Visual Visibility vs Off-Screen Viewport Bounds**:
  - Accurately distinguishes visual concealment (`display: none`, `visibility: hidden`, `opacity: 0`, `0x0` dimensions) from elements placed outside the visible viewport (`rect.right < 0`, `rect.bottom < 0`, `rect.left > viewportWidth`, `rect.top > viewportHeight`).
- **Hierarchical Interaction Chain**:
  - Traces the ancestor tree from `<body>` down to the target leaf node, visually pinpointing any blocking container (`inert`, `<fieldset disabled>`, `pointer-events: none`, or hidden parent).
- **Real-Time State Watcher & Timeline Stream**:
  - Powered by `MutationObserver` to record dynamic state transitions (`disabled: false → true`, `class: btn-active → btn-disabled`, `pointer-events: auto → none`) with precise timestamps.
- **Dual Surface UI**:
  - Sleek toolbar Popup for quick inspections.
  - Isolated, draggable **In-Page DevTools HUD** (docked in a Shadow DOM) with viewport clamping so you never lose context while clicking on the page.
- **Multi-Vector Disabled Analysis**:
  - **HTML**: Detects `disabled`, `aria-disabled`, `readonly`, `hidden`, `inert`, and form controls (`<button>`, `<input>`, `<select>`, `<textarea>`, `<option>`).
  - **CSS**: Checks `pointer-events: none` (direct vs. inherited), `display: none`, `visibility: hidden`, `opacity: 0`.
  - **Ancestors**: Spec-compliant `<fieldset disabled>` handling (including the HTML first `<legend>` exception) and ancestor `inert`.
  - **Form Constraint Validation**: Analyzes sibling controls (`valueMissing`, `typeMismatch`, `patternMismatch`, unchecked required checkboxes, etc.).
- **Framework Detection**:
  - Identifies React (DOM & Fiber roots), Angular, Vue, and jQuery runtimes.
- **Masked Markdown Export**:
  - One-click copy for GitHub Issues and Slack with automatic masking of sensitive form data.
- **100% Local & Zero Telemetry**:
  - All reasoning executes in-browser. Zero analytics, zero external network traffic.

---

## Interaction Status Engine

WhyUI categorizes every selected element into one of three primary interaction states:

| Status | Badge | Technical Definition |
| :--- | :--- | :--- |
| **Interactive** | 🟢 `Interactive` | Element is physically visible, within the viewport, not disabled, allows pointer events, and is directly reachable by user pointer clicks. |
| **Potentially Blocked** | 🟡 `Potentially blocked` | Element is technically clickable and visible, but higher-level constraints may prevent successful user interaction (e.g. form validation errors or `aria-disabled="true"` with active pointer events). |
| **Not Clickable** | 🔴 `Not clickable` | Pointer events are physically or logically blocked by `disabled`, direct or inherited `pointer-events: none`, an occluding overlay, `display: none`, `visibility: hidden`, `inert`, or zero dimensions. |

### Categorical Factor Breakdown
Every report includes a categorized factor breakdown:
- **Interaction Factors**: Native disabled, `aria-disabled`, `pointer-events` (direct vs. inherited), `inert`, `readonly`.
- **Visual & Layout Factors**: Display, visibility, opacity, dimensions (`0x0`), viewport positioning (`off-screen` vs. `in-viewport`).
- **Occlusion Factors**: Topmost element hit test, blocking element tag/id/classes, z-index delta, bounding box overlap.
- **Form Factors**: Form association, required invalid fields count, validation failure breakdown.

---

## Core User Flow

```text
┌────────────────────────────────────────────────────────┐
│ WhyUI · Browser UI Interaction Debugger                │
│ Inspecting: <button id="checkoutBtn" class="btn">      │
├────────────────────────────────────────────────────────┤
│ INTERACTION STATUS                                     │
│ 🔴 NOT CLICKABLE                                       │
│ Element is covered by another element                  │
├────────────────────────────────────────────────────────┤
│ ⚠ BLOCKING ELEMENT DETECTED                            │
│ Element: <div class="modal-backdrop">                  │
│ Dimensions: 1920×1080 | Z-Index: 1050 (target: auto)   │
│ [Inspect Blocking Element]                             │
├────────────────────────────────────────────────────────┤
│ INTERACTION CHAIN                                      │
│ BODY ──► DIV.modal-container ──► FORM ──► BUTTON#checkout
│          (All ancestors allow pointer events)          │
├────────────────────────────────────────────────────────┤
│ WHY CAN'T I CLICK THIS?                                │
│ 🔴 Confirmed: Covered by .modal-backdrop (9/9 points)  │
│ 🔴 Confirmed: Form has 2 invalid required inputs       │
│                                                        │
│ [Watch Changes]  [Copy Report]  [Re-inspect]           │
└────────────────────────────────────────────────────────┘
```

1. Click the **WhyUI** extension icon in Edge or use the in-page HUD.
2. Click **"Select Element on Page"**.
3. Hover over the element on the webpage (shows cyan outline and tag tooltip).
4. Click to select (or press `Escape` to cancel).
5. WhyUI analyzes the element across interaction status, overlay occlusion, computed styles, and ancestors.
6. If an overlay is blocking it, click **[Inspect Blocking Element]** to immediately inspect the occluding layer!

---

## How Element Selection Works

The element picker (`src/content/elementPicker.ts` & `highlighter.ts`) is designed for maximum fidelity and zero permanent DOM pollution:
- **Shadow DOM Isolation**: The picker creates `#whyui-highlighter-host` with an isolated Shadow Root so host styles never distort the picker overlay.
- **Capturing Event Listeners**: Captures mouse movements and clicks during the browser's capture phase (`true`). This ensures clicking the element to select it does **not** trigger page links, form submissions, or application event handlers.
- **High Z-Index (`2147483647`)**: Ensures the selection box and tooltip stay above modal dialogs and fixed banners.
- **Dynamic HUD Repositioning**: The in-page HUD detects if it overlaps the selected target and automatically repositions itself to the opposite corner of the viewport.
- **Clean Teardown**: Upon selection or `Escape`, all event listeners and highlight nodes are completely cleaned up.

---

## How Analysis Works

WhyUI uses a modular, deterministic analyzer pipeline:

| Analyzer | Target Checked | Example Condition Detected |
| :--- | :--- | :--- |
| `interactionAnalyzer.ts` | Multi-factor clickability evaluation | Aggregates all factors into `interactive`, `potentially_blocked`, or `not_clickable` |
| `overlayAnalyzer.ts` | 9-point coordinate hit testing | Obstructing `.modal-backdrop`, floating banners, z-index conflicts |
| `htmlAnalyzer.ts` | Attributes & DOM properties | `disabled`, `aria-disabled="true"`, `inert`, `readonly`, `hidden` |
| `cssAnalyzer.ts` | Computed styles & bounds | `pointer-events: none`, `display: none`, `visibility: hidden`, `opacity: 0`, off-screen |
| `parentAnalyzer.ts` | Ancestor hierarchy | `<fieldset disabled>`, ancestor `inert`, hidden containers, ancestor chain |
| `formAnalyzer.ts` | Form sibling controls | `input:invalid`, `valueMissing`, `typeMismatch`, required checkboxes |
| `eventAnalyzer.ts` | Script control markers | Inline event handlers, React synthetic event fibers, dynamic state markers |
| `framework/` | Page runtime environment | React DOM/Fiber, Angular runtime, Vue app, jQuery |

---

## Confidence Levels

To maintain technical credibility, WhyUI never pretends to know application business logic when it only has browser-level evidence. Every explanation is classified with an explicit confidence level:

- **🔴 Confirmed**: Directly proven by browser engine standards.
  - *Example*: `disabled` attribute on `<button>`, `pointer-events: none` on the element, or `document.elementFromPoint()` returns an overlay element.
- **🟠 Likely**: Direct structural impediment with high probability.
  - *Example*: A parent `<fieldset>` is disabled, or an ancestor element has `inert` applied.
- **🟡 Possible**: Detected correlated condition without guaranteed causality.
  - *Example*: The enclosing form has invalid required inputs (e.g. invalid email format). Submit buttons are commonly gated by JavaScript form validation, but causality cannot be mathematically proven without observing application source code.

---

## Technical Information & Reporting

### Technical Details Drawer
Expandable section providing quick access to:
- Tag Name, ID, Classes
- Active Attributes Map
- Computed Styles (`pointer-events`, `display`, `visibility`, `opacity`, `cursor`, `z-index`, `position`)
- Viewport Bounding Box (`top`, `left`, `width`, `height`, `inViewport`)
- Overlay Obstruction Details (topmost element, z-index delta, sample hit rate)
- Form Association (`#orderForm`)
- Interaction Chain (`BODY -> DIV.modal -> FORM -> BUTTON`)

### Copy Report
Generates a GitHub-flavored Markdown report with automatic sensitive data masking:
```markdown
### WhyUI Report: Browser UI Interaction Debugger

**Element**: `<button id="submitBtn" class="btn btn-primary">`
**Interaction Status**: 🔴 NOT CLICKABLE (Covered by overlay)

**Interaction Factors**:
- Can Receive Clicks: No
- Native Disabled: No
- Pointer Events: auto (effective: auto)
- Visual Visibility: visible
- Viewport: in-viewport (rect: 450x40 at (200, 350))

**Blocking Element**:
- Tag: `<div class="modal-backdrop">`
- Z-Index: 1050 (target z-index: auto)
- Bounds: 1920x1080 at (0, 0)
- Occlusion Hit Rate: 9/9 sample points blocked

**Confirmed Reasons**:
- Covered by another element: The element is physically covered by <div class="modal-backdrop"> which intercepts all pointer clicks.

**Interaction Chain**:
BODY ──► DIV.modal-container ──► FORM ──► BUTTON#submitBtn

---
*Report generated by WhyUI by SkyDevLab*
```

---

## Installation Guide (Edge Developer Mode)

1. Clone or download this repository.
2. Build the extension bundle:
   ```bash
   npm install
   npm run build
   ```
3. Open Microsoft Edge and navigate to:
   ```text
   edge://extensions/
   ```
4. Enable **Developer mode** using the toggle switch in the left navigation sidebar.
5. Click the **Load unpacked** button.
6. Select the `dist` folder located at:
   ```text
   c:\Users\suraj\source\repos\WhyUI\dist
   ```
7. Pin **WhyUI** to your Edge toolbar for one-click access!

---

## Verification Test Suite (Workbench & Tests)

### 1. Interactive Test Workbench
A standalone interactive test workbench is included in [`testPages/index.html`](testPages/index.html).

It contains live interactive test cards with interactive toggle controls (`[Toggle Disabled]`, `[Toggle Overlay]`, `[Toggle Pointer Events]`, `[Scroll To Element]`) covering all 17 interaction scenarios:
1. **Normal enabled button** (Control baseline — 🟢 Interactive)
2. **Button with `disabled`** (🔴 Native disabled)
3. **Button with `aria-disabled="true"`** (🟡 Accessible disabled with active pointer events)
4. **Enclosing `<fieldset disabled>`** (🔴 Disabled by ancestor fieldset)
5. **Form with invalid input range** (🟡 Possible form validation issue)
6. **Form with empty required field** (🟡 Possible `valueMissing`)
7. **Form with invalid email format** (🟡 Possible `typeMismatch`)
8. **Form with unchecked required checkbox** (🟡 Possible checkbox constraint)
9. **CSS `pointer-events: none`** (🔴 Click prevention via direct style)
10. **Invisible button (`display: none`, `visibility: hidden`, `opacity: 0`)** (🔴 Visually hidden)
11. **Translucent modal backdrop overlay** (🔴 Occluded by overlay with `[Inspect Blocking Element]`)
12. **Dynamically disabled button** (Dynamic state transitions)
13. **Dynamically enabled button** (Dynamic transition from disabled to interactive)
14. **Standalone button outside a form** (Verify zero false positives)
15. **Nested disabled elements** (Inert ancestor + disabled fieldset)
16. **Ancestor with `pointer-events: none`** (🔴 Inherited pointer-events blocking)
17. **Off-screen element** (🔴 Outside viewport bounds with scroll trigger)

### 2. Automated Vitest Suite (35 Unit Tests)
Run the automated test suite covering all analyzers and interaction scenarios:
```bash
npm test
```
All **35 unit tests** pass deterministically with zero warnings or errors.

---

## Development Setup

```bash
# Clone the repository
git clone https://github.com/SkyDevLab/WhyUI.git
cd WhyUI

# Install dependencies
npm install

# Run all 35 unit tests with Vitest
npm test

# Run TypeScript type check
npm run lint

# Build extension distribution (Manifest V3 + standalone IIFE content script)
npm run build
```

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architecture diagrams and module documentation.

```text
src/
├── analyzer/                  # Core deterministic engine
│   ├── cssAnalyzer.ts         # Computed styles, visibility, & viewport bounds
│   ├── eventAnalyzer.ts       # Inline listeners & framework synthetic fibers
│   ├── explanationEngine.ts   # Rule-based confidence classification
│   ├── formAnalyzer.ts        # HTML5 constraint validation
│   ├── htmlAnalyzer.ts        # Native attributes & tag semantics
│   ├── interactionAnalyzer.ts # 🟢/🟡/🔴 Interaction status orchestrator
│   ├── overlayAnalyzer.ts     # 9-point coordinate sampling & z-index analysis
│   ├── parentAnalyzer.ts      # Fieldset cascade & ancestor interaction chain
│   ├── watcher.ts             # MutationObserver live state watcher
│   └── index.ts               # Master analyzer pipeline
├── background/                # Manifest V3 service worker
│   └── serviceWorker.ts
├── content/                   # Webpage injection pipeline
│   ├── contentScript.ts       # Content script entry (standalone IIFE bundle)
│   ├── elementPicker.ts       # Capturing non-destructive element picker
│   ├── highlighter.ts         # Shadow DOM highlight overlay & tooltip
│   └── inPageHud.ts           # Draggable floating DevTools panel with repositioning
├── framework/                 # Extensible framework analyzers
│   ├── detector.ts            # React, Angular, Vue, jQuery detection
│   ├── reactAnalyzer.ts       # React v1 + v2 deep inspection stub
│   ├── angularAnalyzer.ts     # Angular v1 + v2 stub
│   ├── vueAnalyzer.ts         # Vue v1 + v2 stub
│   └── jqueryAnalyzer.ts      # jQuery v1 + v2 stub
├── popup/                     # Toolbar extension popup (React + Vite)
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.html
│   └── popup.css
└── shared/                    # Shared contracts and utilities
    ├── messages.ts            # Typed IPC message definitions
    ├── reportGenerator.ts     # Masked markdown report export
    └── types.ts               # Core TypeScript interfaces
```

---

## Security & Privacy

See [docs/PRIVACY.md](docs/PRIVACY.md) for full privacy specifications.
- **Local-First Processing**: 100% of DOM analysis runs locally within the user's browser context.
- **Zero Telemetry**: No tracking, analytics, remote logging, or external API calls.
- **Credential & Form Masking**: Password input values are never accessed or displayed. Text values are masked in generated reports.
- **Least-Privilege Permissions**: Uses only `activeTab`, `scripting`, and `storage`.

---

## Important Limitations

WhyUI is engineered for **observable browser evidence**. It does not pretend to magically reverse-engineer proprietary server-side logic or minified internal JavaScript application closures.

For example, if an application contains:
```javascript
if (!user.permissions.includes('admin')) {
  button.disabled = true;
}
```
WhyUI will accurately report:
```text
The button is disabled dynamically.
WhyUI detected:
- disabled attribute is present
- DOM mutation occurred after page load
- JavaScript appears to control the state

Application-level reason:
Could not be determined from browser-visible evidence.
```
This distinction ensures technical precision, transparency, and developer trust.

---

## Future Roadmap

### v1.0 & v1.5 (Completed)
- [x] "Why is this button disabled?" deterministic engine
- [x] "Why can't I click this element?" Interaction Debugger
- [x] 9-point coordinate sampling overlay occlusion detector
- [x] One-click `[Inspect Blocking Element]` switch
- [x] Element picker with Shadow DOM highlighter & dynamic HUD repositioning
- [x] HTML & CSS computed styles analysis with viewport off-screen detection
- [x] Spec-compliant parent `<fieldset>` & `inert` cascade detection
- [x] Ancestor interaction chain tree visualization
- [x] Live state watcher (`MutationObserver`) with timeline stream
- [x] Masked Markdown report generator
- [x] In-Page DevTools HUD + Toolbar popup
- [x] 35 passing Vitest unit tests & interactive workbench

### v2.0 (Planned)
- [ ] Deep React state analysis (props & hook state extraction via React DevTools hook)
- [ ] Angular component state reflection
- [ ] Vue reactivity inspector
- [ ] Multi-element side-by-side comparison view

### v3.0
- [ ] JavaScript call stack tracing on attribute mutation via DevTools Protocol
- [ ] Event listener breakpoint assistance

---

## Published by
**SkyDevLab** — Developer tools for modern web engineering.


## 👤 Author & Project Identity

**WhyUI** is created and maintained by **Surya Pratap Singh (SkyDevLab)**.

GitHub: https://github.com/SkyDevLab
