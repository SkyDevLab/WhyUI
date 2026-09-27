# Contributing to WhyUI

Thank you for your interest in improving **WhyUI by SkyDevLab**!

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/SkyDevLab/WhyUI.git
   cd WhyUI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run automated tests (Vitest):
   ```bash
   npm test
   ```

4. Typecheck:
   ```bash
   npm run lint
   ```

5. Build the extension:
   ```bash
   npm run build
   ```

6. Package for Microsoft Edge Add-ons:
   ```bash
   npm run pack
   ```

## Pull Request Guidelines

- Ensure all Vitest tests pass (`npm test`).
- Ensure TypeScript compilation produces zero errors (`npm run lint`).
- Maintain local-first and zero-telemetry principles. All analyzers must remain deterministic.
- Follow existing code style and naming conventions.
