# WhyUI Privacy & Security Documentation

Published by **SkyDevLab**

## Core Privacy Principles

WhyUI is engineered with a strict **Local-First, Zero-Telemetry** architecture:

1. **100% Local Execution**: All DOM inspection, style computation, form validation evaluation, and report generation execute entirely inside the developer's local Microsoft Edge browser instance.
2. **Zero Network Transmission**: WhyUI makes **no** external network requests, **no** API calls, and sends **zero** telemetry or analytics events.
3. **Sensitive Data Protection & Masking**:
   - WhyUI **never** reads or stores user passwords.
   - Form values from `input[type="password"]` are never displayed in the UI or included in generated reports.
   - Email addresses and token-like strings are automatically masked (e.g. `u***r@example.com` or `token=***`).
   - Reports only log validation states (e.g. `Required - Empty`), never raw sensitive credentials.
4. **No Cookie or Auth Token Access**: WhyUI does not inspect or request access to cookies, authentication credentials, local storage tokens, or browser history.
5. **No Remote Code Execution**: WhyUI is fully packaged with local TypeScript/JavaScript bundles conforming to Manifest V3 requirements. It does not use `eval`, dynamic scripts, or remote CDN loading.

---

## Browser Permissions Explained

WhyUI requests the minimum possible set of permissions in `manifest.json`:

| Permission | Purpose |
| :--- | :--- |
| `activeTab` | Permits temporary inspection of the webpage when the developer interacts with WhyUI. Does not grant background access to tabs. |
| `scripting` | Enables element picker and highlighter injection when requested by the developer. |
| `storage` | Stores the active element's local analysis so it can be mirrored seamlessly between the active tab and the toolbar popup. Data never leaves local storage. |
