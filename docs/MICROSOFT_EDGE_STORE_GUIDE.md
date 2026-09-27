# Microsoft Edge Add-ons Submission Guide for WhyUI

This guide contains everything you need to submit **WhyUI by SkyDevLab** to the [Microsoft Edge Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview).

---

## 1. Quick Summary of Package Assets

| Asset | Location / Filename | Specifications |
| :--- | :--- | :--- |
| **Extension ZIP Package** | [`WhyUI-v1.0.0-Edge.zip`](../WhyUI-v1.0.0-Edge.zip) | Manifest V3 bundle (1.11 MB) with `manifest.json` at the root. |
| **Store Logo** | [`public/icons/icon128.png`](../public/icons/icon128.png) | 128 × 128 px PNG (transparent background) |
| **Small Promo Tile** | [`public/icons/promo_tile_440x280.png`](../public/icons/promo_tile_440x280.png) | 440 × 280 px PNG |
| **Privacy Policy URL** | `https://github.com/SkyDevLab/WhyUI/blob/main/docs/PRIVACY.md` | Public GitHub link |
| **Support / Issues URL** | `https://github.com/SkyDevLab/WhyUI/issues` | Public GitHub link |

---

## 2. Step-by-Step Submission Process

### Step 1: Log in to Microsoft Partner Center
1. Navigate to: [https://partner.microsoft.com/dashboard/microsoftedge/overview](https://partner.microsoft.com/dashboard/microsoftedge/overview)
2. Sign in with your developer account.
3. Click **Create new extension** in the upper right.

### Step 2: Upload the Extension Package (.zip)
1. Drag and drop or browse to select:
   ```text
   C:\Users\suraj\source\repos\WhyUI\WhyUI-v1.0.0-Edge.zip
   ```
2. The Partner Center validator will verify your `manifest.json`:
   - `Manifest version`: 3
   - `Name`: WhyUI
   - `Permissions`: `activeTab`, `scripting`, `storage`
   - Validation will pass with green checkmarks.

### Step 3: Fill in Store Listing Details

#### Extension Name
```text
WhyUI - Browser UI Interaction Debugger
```

#### Short Description (Summary)
```text
Understand why web UI elements are disabled, unclickable, covered by overlays, or hidden. Built for developers by SkyDevLab.
```

#### Long Description
```markdown
WhyUI is a developer-focused Microsoft Edge extension that diagnoses why a web UI element is disabled, unclickable, covered, hidden, readonly, or otherwise not interactive.

Instead of manually digging through computed styles, walking deep DOM trees, and debugging z-indexes in DevTools, WhyUI provides automatic, deterministic explanations:

🔥 KEY CAPABILITIES:
- "Why can't I click this element?": Categorizes elements into Interactive (🟢), Potentially Blocked (🟡), or Not Clickable (🔴).
- 9-Point Overlay Occlusion Hit Testing: Detects modal backdrops, floating banners, and z-index obstructions with an instant "[Inspect Blocking Element]" switch.
- Multi-Vector Disabled Analysis: Detects native disabled attributes, aria-disabled="true", readonly, hidden, and inert ancestors.
- HTML5 Form Validation Gating: Detects when submit triggers are blocked by invalid sibling inputs (valueMissing, typeMismatch, patternMismatch, unchecked required checkboxes).
- Hierarchical Interaction Chain: Traces from <body> down to the target leaf, pinpointing blocking ancestors (<fieldset disabled> or pointer-events: none).
- Live Mutation Timeline: Uses MutationObserver to stream real-time attribute and CSS property transitions.
- Dual Surface UI: Toolbar popup and draggable In-Page DevTools HUD (docked in an isolated Shadow DOM).

🔒 PRIVACY & SECURITY:
- 100% Local Processing: All analysis runs in your browser; zero data leaves your device.
- Zero Telemetry: No analytics, tracking, or remote API calls.
- Credential Protection: Passwords and sensitive form inputs are never collected or displayed.

Published by SkyDevLab.
```

#### Categories
- Primary Category: **Developer Tools**
- Secondary Category: **Productivity**

#### Search Terms / Keywords
```text
developer tools, debug, disabled button, inspector, dom, css, accessibility, form validation, pointer events, devtools
```

### Step 4: Add Store Graphics
1. **Extension Logo**: Upload [`public/icons/icon128.png`](../public/icons/icon128.png) (128×128).
2. **Promotional Tile**: Upload [`public/icons/promo_tile_440x280.png`](../public/icons/promo_tile_440x280.png) (440×280).
3. **Screenshots**: Take 1–2 screenshots of the popup or in-page HUD inspecting an element on [`testPages/index.html`](../testPages/index.html) (1280×800 or 640×400).

### Step 5: Privacy & Compliance
1. **Privacy Policy URL**:
   ```text
   https://github.com/SkyDevLab/WhyUI/blob/main/docs/PRIVACY.md
   ```
2. **Support URL**:
   ```text
   https://github.com/SkyDevLab/WhyUI/issues
   ```
3. **Single Purpose Description**:
   ```text
   WhyUI helps web developers debug and understand why UI elements are disabled or not interactive on webpages.
   ```
4. **Permission Justifications**:
   - `activeTab`: Used to inspect the UI element selected by the user on the active webpage.
   - `scripting`: Used to inject the non-destructive element picker and HUD when selected by the user.
   - `storage`: Used to save the user's latest element analysis and watch state locally.

### Step 6: Submit for Certification
Click **Submit**! Microsoft Edge Add-ons certification typically takes between 24 and 72 hours.
