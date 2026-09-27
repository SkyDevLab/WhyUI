# Microsoft Edge Installation Guide

Follow these steps to install and test **WhyUI by SkyDevLab** in Microsoft Edge Developer Mode:

### Step 1: Build the Extension
Ensure dependencies are installed and the production bundle is compiled:
```bash
npm install
npm run build
```
This produces the self-contained, Manifest V3-compliant bundle in the `dist/` directory.

### Step 2: Open Extensions in Microsoft Edge
1. Launch Microsoft Edge.
2. In the address bar, navigate to:
   ```text
   edge://extensions/
   ```
3. In the left sidebar (or bottom-left), toggle **Developer mode** to **ON**.

### Step 3: Load Unpacked Extension
1. Click the **Load unpacked** button that appears at the top.
2. In the folder picker dialog, browse to your repository directory and select the `dist` folder:
   ```text
   c:\Users\suraj\source\repos\WhyUI\dist
   ```
3. Click **Select Folder**.

### Step 4: Pin WhyUI to Toolbar
1. Click the **Extensions puzzle icon** in Microsoft Edge's toolbar.
2. Find **WhyUI** (`WhyUI by SkyDevLab`).
3. Click the **Show in toolbar** (eye icon) to pin WhyUI for 1-click access.

---

## Verifying with the Test Suite

1. Open `testPages/index.html` in Microsoft Edge:
   - Either double-click `c:\Users\suraj\source\repos\WhyUI\testPages\index.html`
   - Or run `npx serve .` and navigate to `http://localhost:3000/testPages/index.html`.
2. Click the WhyUI toolbar icon.
3. Click **"Select Element on Page"**.
4. Hover over any of the 15 test cards (e.g. Disabled Button, Pointer-events: none, Covered Button, Form Inputs).
5. Notice the cyan highlight and tag tooltip. Click to inspect!
6. View the deterministic explanations (🔴 Confirmed, 🟠 Likely, 🟡 Possible), form analysis, live MutationObserver watcher, and copy report functionality.
