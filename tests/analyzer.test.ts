import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeElement } from '../src/analyzer';
import { generateMarkdownReport } from '../src/shared/reportGenerator';
import { ElementWatcher } from '../src/analyzer/watcher';
import { ElementPicker } from '../src/content/elementPicker';

describe('WhyUI Analyzer Test Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // 1. Normal enabled button
  it('Case 1: Normal enabled button is identified as interactive and enabled', () => {
    document.body.innerHTML = `
      <form id="testForm">
        <button id="submitBtn" type="submit">Submit</button>
      </form>
    `;
    const btn = document.getElementById('submitBtn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.primaryStatus).toBe('enabled');
    expect(result.isInteractive).toBe(true);
    expect(result.html.disabledAttr).toBe(false);
    expect(result.html.disabledProp).toBe(false);
    expect(result.explanations.some((e) => e.severity === 'error')).toBe(false);
  });

  // 2. Button with disabled
  it('Case 2: Button with disabled attribute is detected as Confirmed disabled', () => {
    document.body.innerHTML = `<button id="btn" disabled>Click Me</button>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.primaryStatus).toBe('disabled');
    expect(result.isInteractive).toBe(false);
    expect(result.html.disabledAttr).toBe(true);
    const confirmed = result.explanations.find(
      (e) => e.confidence === 'confirmed' && e.id === 'html-disabled-attr'
    );
    expect(confirmed).toBeDefined();
    expect(confirmed?.title).toContain('HTML "disabled" attribute');
  });

  // 3. Button with aria-disabled
  it('Case 3: Button with aria-disabled="true" is detected', () => {
    document.body.innerHTML = `<button id="btn" aria-disabled="true">Submit</button>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.primaryStatus).toBe('aria-disabled');
    expect(result.html.ariaDisabled).toBe('true');
    const explanation = result.explanations.find((e) => e.id === 'aria-disabled-true');
    expect(explanation).toBeDefined();
    expect(explanation?.confidence).toBe('confirmed');
  });

  // 4. Disabled fieldset
  it('Case 4: Button in a disabled fieldset is detected as Likely disabled by ancestor', () => {
    document.body.innerHTML = `
      <form>
        <fieldset disabled id="fs">
          <legend>Form Group</legend>
          <button id="btn" type="submit">Submit</button>
        </fieldset>
      </form>
    `;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.primaryStatus).toBe('disabled');
    expect(result.parent.inDisabledFieldset).toBe(true);
    const explanation = result.explanations.find((e) => e.id === 'parent-fieldset-disabled');
    expect(explanation).toBeDefined();
    expect(explanation?.confidence).toBe('likely');
    expect(explanation?.evidence[0]).toContain('fieldset');
  });

  // 4b. HTML spec exception: button in the first legend of a disabled fieldset is NOT disabled
  it('Case 4b: Button in the first legend of a disabled fieldset is exempt per HTML spec', () => {
    document.body.innerHTML = `
      <fieldset disabled id="fs">
        <legend><button id="legendBtn">Caption Action</button></legend>
        <button id="otherBtn">Other</button>
      </fieldset>
    `;
    const legendBtn = document.getElementById('legendBtn') as HTMLButtonElement;
    const result = analyzeElement(legendBtn);

    expect(result.parent.inLegendException).toBe(true);
    expect(result.parent.inDisabledFieldset).toBe(false);
  });

  // 5. Invalid required input in form
  it('Case 5: Form with invalid required input is detected as Possible contributing condition', () => {
    document.body.innerHTML = `
      <form id="orderForm">
        <input id="qty" type="number" min="5" max="10" value="2" required />
        <button id="submitBtn" type="submit">Place Order</button>
      </form>
    `;
    const btn = document.getElementById('submitBtn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.form.hasForm).toBe(true);
    expect(result.form.invalidFieldsCount).toBe(1);
    const formExp = result.explanations.find((e) => e.id === 'form-validation-invalid');
    expect(formExp).toBeDefined();
    expect(formExp?.confidence).toBe('possible');
    expect(formExp?.evidence[0]).toContain('qty');
  });

  // 6. Empty required input
  it('Case 6: Empty required input is detected with valueMissing explanation', () => {
    document.body.innerHTML = `
      <form id="loginForm">
        <label for="pwd">Password</label>
        <input id="pwd" type="password" required value="" />
        <button id="submitBtn" type="submit">Login</button>
      </form>
    `;
    const btn = document.getElementById('submitBtn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.form.invalidFieldsCount).toBe(1);
    const pwdField = result.form.fields.find((f) => f.id === 'pwd');
    expect(pwdField).toBeDefined();
    expect(pwdField?.valueMissing).toBe(true);
    expect(pwdField?.statusSummary).toContain('Required - Current value empty');
  });

  // 7. Invalid email
  it('Case 7: Invalid email input is detected with typeMismatch explanation', () => {
    document.body.innerHTML = `
      <form id="contactForm">
        <label for="emailInput">Email Address</label>
        <input id="emailInput" type="email" value="not-a-valid-email" />
        <button id="sendBtn" type="submit">Send</button>
      </form>
    `;
    const btn = document.getElementById('sendBtn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.form.invalidFieldsCount).toBe(1);
    const emailField = result.form.fields.find((f) => f.id === 'emailInput');
    expect(emailField).toBeDefined();
    expect(emailField?.typeMismatch).toBe(true);
    expect(emailField?.statusSummary).toContain('invalid email');
  });

  // 8. Unchecked required checkbox
  it('Case 8: Unchecked required checkbox is detected', () => {
    document.body.innerHTML = `
      <form id="termsForm">
        <label>
          <input id="termsCheckbox" type="checkbox" required />
          I agree to the Terms of Service
        </label>
        <button id="continueBtn" type="submit">Continue</button>
      </form>
    `;
    const btn = document.getElementById('continueBtn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.form.invalidFieldsCount).toBe(1);
    const chk = result.form.fields.find((f) => f.id === 'termsCheckbox');
    expect(chk).toBeDefined();
    expect(chk?.statusSummary).toContain('Not checked');
  });

  // 9. pointer-events: none
  it('Case 9: pointer-events: none on element is detected as Confirmed non-interactive', () => {
    document.body.innerHTML = `<button id="btn" style="pointer-events: none;">Ghost Button</button>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.css.pointerEvents).toBe('none');
    expect(result.primaryStatus).toBe('non-interactive');
    const exp = result.explanations.find((e) => e.id === 'css-pointer-events-none');
    expect(exp).toBeDefined();
    expect(exp?.confidence).toBe('confirmed');
    expect(exp?.severity).toBe('error');
  });

  // 10. Invisible button (display: none or visibility: hidden or opacity: 0)
  it('Case 10: Invisible button is detected as Confirmed hidden', () => {
    document.body.innerHTML = `
      <button id="hiddenDisplay" style="display: none;">Hidden</button>
      <button id="hiddenVis" style="visibility: hidden;">Invisible</button>
      <button id="hiddenOp" style="opacity: 0;">Transparent</button>
    `;
    const b1 = document.getElementById('hiddenDisplay') as HTMLButtonElement;
    const r1 = analyzeElement(b1);
    expect(r1.primaryStatus).toBe('hidden');
    expect(r1.explanations.some((e) => e.id === 'css-hidden')).toBe(true);

    const b2 = document.getElementById('hiddenVis') as HTMLButtonElement;
    const r2 = analyzeElement(b2);
    expect(r2.primaryStatus).toBe('hidden');
    expect(r2.explanations.some((e) => e.id === 'css-hidden')).toBe(true);

    const b3 = document.getElementById('hiddenOp') as HTMLButtonElement;
    const r3 = analyzeElement(b3);
    expect(r3.explanations.some((e) => e.id === 'css-opacity-zero')).toBe(true);
  });

  // 11. Overlay covering button
  it('Case 11: Overlay covering button is detected as Likely covered', () => {
    document.body.innerHTML = `
      <div id="page">
        <button id="targetBtn">Behind Modal</button>
        <div class="modal-backdrop" role="dialog" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5);">
          Modal Content
        </div>
      </div>
    `;
    const btn = document.getElementById('targetBtn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.overlay.isCovered).toBe(true);
    expect(result.primaryStatus).toBe('covered');
    const exp = result.explanations.find((e) => e.id === 'overlay-intercepting');
    expect(exp).toBeDefined();
    expect(exp?.confidence).toBe('likely');
  });

  // 12. Dynamically disabled button
  it('Case 12: Dynamically disabled button is detected via MutationObserver watcher', async () => {
    document.body.innerHTML = `<button id="dynBtn">Dynamic</button>`;
    const btn = document.getElementById('dynBtn') as HTMLButtonElement;

    let receivedChange = false;
    let oldVal = '';
    let newVal = '';

    const watcher = new ElementWatcher((event) => {
      receivedChange = true;
      oldVal = event.oldValue || '';
      newVal = event.newValue || '';
    });

    watcher.start(btn);

    // Dynamically disable
    btn.setAttribute('disabled', 'true');

    // Wait for microtask / mutation observer flush
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedChange).toBe(true);
    expect(oldVal).toBe('false');
    expect(newVal).toBe('true');
    watcher.stop();
  });

  // 13. Dynamically enabled button
  it('Case 13: Dynamically enabled button is detected via watcher', async () => {
    document.body.innerHTML = `<button id="dynBtn2" disabled>Dynamic</button>`;
    const btn = document.getElementById('dynBtn2') as HTMLButtonElement;

    let receivedChange = false;
    let attributeName = '';

    const watcher = new ElementWatcher((event) => {
      receivedChange = true;
      attributeName = event.attributeName;
    });

    watcher.start(btn);

    // Dynamically remove disabled
    btn.removeAttribute('disabled');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedChange).toBe(true);
    expect(attributeName).toBe('disabled');
    watcher.stop();
  });

  // 14. Button outside a form
  it('Case 14: Button outside a form is analyzed with hasForm = false', () => {
    document.body.innerHTML = `
      <div class="card">
        <button id="standaloneBtn" disabled>Standalone</button>
      </div>
    `;
    const btn = document.getElementById('standaloneBtn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.form.hasForm).toBe(false);
    expect(result.form.fields.length).toBe(0);
    expect(result.html.disabledAttr).toBe(true);
    expect(result.primaryStatus).toBe('disabled');
  });

  // 15. Nested disabled elements (inert ancestor + disabled parent)
  it('Case 15: Nested disabled elements inspects full hierarchy', () => {
    document.body.innerHTML = `
      <div id="section" inert>
        <fieldset disabled id="innerFs">
          <button id="nestedBtn">Nested Action</button>
        </fieldset>
      </div>
    `;
    const btn = document.getElementById('nestedBtn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.parent.inDisabledFieldset).toBe(true);
    expect(result.parent.inertAncestor).toBe(true);
    expect(result.parent.ancestorIssues.length).toBeGreaterThanOrEqual(2);
    expect(result.primaryStatus).toBe('disabled');
  });

  // Report generation & Sensitive Data Masking test
  it('Case 16: Markdown report generator masks sensitive information', () => {
    document.body.innerHTML = `
      <form id="secureForm">
        <label for="pwdInput">Password</label>
        <input id="pwdInput" type="password" required value="SuperSecretPassword123" />
        <label for="emailInput">Email</label>
        <input id="emailInput" type="email" required value="user@example.com" />
        <button id="loginBtn" disabled>Login</button>
      </form>
    `;
    const btn = document.getElementById('loginBtn') as HTMLButtonElement;
    const result = analyzeElement(btn);
    const report = generateMarkdownReport(result);

    // Must never contain sensitive password value
    expect(report).not.toContain('SuperSecretPassword123');
    expect(report).toContain('WhyUI Report');
    expect(report).toContain('Confirmed reasons');
    expect(report).toContain('"disabled" attribute');
    expect(report).toContain('Microsoft Edge');
  });
});

describe('WhyUI Interaction Analyzer Suite (Why Can\'t I Click?)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // 1. Button with pointer-events: none
  it('Interaction 1: Button with pointer-events: none is detected as directly blocked', () => {
    document.body.innerHTML = `<button id="btn" style="pointer-events: none;">Click</button>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.interaction.state).toBe('not_interactive');
    expect(result.interaction.canClick).toBe(false);
    expect(result.interaction.pointerEvents.isBlocked).toBe(true);
    expect(result.interaction.pointerEvents.source).toBe('self');
    expect(result.interaction.statusLabel).toContain('Not clickable');
    const exp = result.explanations.find((e) => e.id === 'css-pointer-events-none');
    expect(exp?.confidence).toBe('confirmed');
  });

  // 2. Ancestor with pointer-events: none
  it('Interaction 2: Ancestor with pointer-events: none detects inherited blockage and identifies source', () => {
    document.body.innerHTML = `
      <div id="checkoutContainer" class="checkout-box" style="pointer-events: none;">
        <button id="btn">Pay Now</button>
      </div>
    `;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.interaction.state).toBe('not_interactive');
    expect(result.interaction.canClick).toBe(false);
    expect(result.interaction.pointerEvents.isBlocked).toBe(true);
    expect(result.interaction.pointerEvents.source).toBe('ancestor');
    expect(result.interaction.pointerEvents.blockingElementSelector).toContain('div#checkoutContainer');
    const exp = result.explanations.find((e) => e.id === 'parent-pointer-events-none');
    expect(exp).toBeDefined();
    expect(exp?.confidence).toBe('likely');
  });

  // 3. Element covered by overlay
  it('Interaction 3: Element covered by overlay is detected with high z-index stacking info', () => {
    document.body.innerHTML = `
      <div class="page">
        <button id="targetBtn">Behind Dialog</button>
        <div class="modal-backdrop" role="dialog" style="position: fixed; inset: 0; z-index: 9999;"></div>
      </div>
    `;
    const btn = document.getElementById('targetBtn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.interaction.overlay.isCovered).toBe(true);
    expect(result.interaction.state).toBe('not_interactive');
    expect(result.interaction.canClick).toBe(false);
    expect(result.interaction.statusLabel).toContain('Not clickable');
    const exp = result.explanations.find((e) => e.id === 'overlay-intercepting');
    expect(exp?.confidence).toBe('likely');
  });

  // 4. Element not covered
  it('Interaction 4: Element not covered reports isCovered false', () => {
    document.body.innerHTML = `<button id="btn">Clear Button</button>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.interaction.overlay.isCovered).toBe(false);
  });

  // 5. Overlay with pointer-events: none does not intercept clicks
  it('Interaction 5: Overlay with pointer-events: none does not block pointer interaction', () => {
    document.body.innerHTML = `
      <div style="position: relative;">
        <button id="btn">Clickable Button</button>
        <div id="ghostOverlay" style="position: absolute; inset: 0; pointer-events: none;"></div>
      </div>
    `;
    // Mock document.elementFromPoint
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const overlay = document.getElementById('ghostOverlay') as HTMLDivElement;

    const originalEFP = document.elementFromPoint;
    try {
      document.elementFromPoint = (_x: number, _y: number) => {
        // Return ghost overlay which has pointer-events: none
        return overlay;
      };

      const result = analyzeElement(btn);
      expect(result.interaction.overlay.isCovered).toBe(false);
    } finally {
      document.elementFromPoint = originalEFP;
    }
  });

  // 6. Overlay intersecting only part of target
  it('Interaction 6: Overlay intersecting partial coordinate points reports intersection details', () => {
    document.body.innerHTML = `
      <div style="position: relative;">
        <button id="btn">Partially Covered</button>
        <div id="halfOverlay">Half</div>
      </div>
    `;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const halfOverlay = document.getElementById('halfOverlay') as HTMLDivElement;

    // Mock getBoundingClientRect
    btn.getBoundingClientRect = () => ({
      width: 100,
      height: 40,
      top: 10,
      left: 10,
      bottom: 50,
      right: 110,
      x: 10,
      y: 10,
      toJSON: () => {},
    });

    const originalEFP = document.elementFromPoint;
    try {
      document.elementFromPoint = (x: number, y: number) => {
        // Only cover top-left portion
        if (x < 30 && y < 30) {
          return halfOverlay;
        }
        return btn;
      };

      const result = analyzeElement(btn);
      expect(result.interaction.overlay.isCovered).toBe(true);
      expect(result.interaction.overlay.intersectedPoints).toContain('top-left');
      expect(result.interaction.overlay.intersectedPoints.length).toBeLessThan(9);
    } finally {
      document.elementFromPoint = originalEFP;
    }
  });

  // 7. Element outside viewport (off-screen)
  it('Interaction 7: Element outside viewport is detected as off-screen and potentially blocked', () => {
    document.body.innerHTML = `<button id="offScreenBtn">Off Screen</button>`;
    const btn = document.getElementById('offScreenBtn') as HTMLButtonElement;

    btn.getBoundingClientRect = () => ({
      width: 100,
      height: 40,
      top: 200,
      left: -1200,
      bottom: 240,
      right: -1100,
      x: -1200,
      y: 200,
      toJSON: () => {},
    });

    const result = analyzeElement(btn);

    expect(result.interaction.visibility.isOffScreen).toBe(true);
    expect(result.interaction.state).toBe('potentially_blocked');
    expect(result.interaction.statusLabel).toContain('Potentially blocked');
    const exp = result.explanations.find((e) => e.id === 'interaction-off-screen');
    expect(exp).toBeDefined();
    expect(exp?.confidence).toBe('likely');
  });

  // 8. display: none
  it('Interaction 8: display: none is classified as hidden_display_none and not interactive', () => {
    document.body.innerHTML = `<button id="btn" style="display: none;">Click</button>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.interaction.visibility.visualState).toBe('hidden_display_none');
    expect(result.interaction.canClick).toBe(false);
    expect(result.interaction.state).toBe('not_interactive');
  });

  // 9. visibility: hidden
  it('Interaction 9: visibility: hidden is classified as invisible_visibility_hidden and not interactive', () => {
    document.body.innerHTML = `<button id="btn" style="visibility: hidden;">Click</button>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.interaction.visibility.visualState).toBe('invisible_visibility_hidden');
    expect(result.interaction.canClick).toBe(false);
    expect(result.interaction.state).toBe('not_interactive');
  });

  // 10. opacity: 0
  it('Interaction 10: opacity: 0 is classified as transparent_opacity_zero and can receive pointer events', () => {
    document.body.innerHTML = `<button id="btn" style="opacity: 0;">Click</button>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.interaction.visibility.visualState).toBe('transparent_opacity_zero');
    expect(result.interaction.visibility.canReceivePointerEvents).toBe(true);
    expect(result.interaction.visibility.visualDescription).toContain('invisible visually');
  });

  // 11. Zero-sized element
  it('Interaction 11: Zero-sized element is detected as potentially blocked', () => {
    document.body.innerHTML = `<button id="btn" style="width: 0px; height: 0px;">Click</button>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;

    btn.getBoundingClientRect = () => ({
      width: 0,
      height: 0,
      top: 10,
      left: 10,
      bottom: 10,
      right: 10,
      x: 10,
      y: 10,
      toJSON: () => {},
    });

    const result = analyzeElement(btn);
    expect(result.interaction.visibility.isZeroSized).toBe(true);
  });

  // 12. inert ancestor
  it('Interaction 12: inert ancestor marks interaction state as not_interactive', () => {
    document.body.innerHTML = `
      <div inert id="inertWrapper">
        <button id="btn">Click</button>
      </div>
    `;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.interaction.state).toBe('not_interactive');
    expect(result.interaction.ancestorBlock.isBlocked).toBe(true);
    expect(result.interaction.ancestorBlock.reason).toContain('inert');
  });

  // 13. Disabled fieldset
  it('Interaction 13: Disabled fieldset marks interaction state as not_interactive', () => {
    document.body.innerHTML = `
      <fieldset disabled id="fs">
        <button id="btn">Click</button>
      </fieldset>
    `;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.interaction.state).toBe('not_interactive');
    expect(result.interaction.ancestorBlock.isBlocked).toBe(true);
    expect(result.interaction.ancestorBlock.reason).toContain('disabled');
  });

  // 14. Normal clickable button
  it('Interaction 14: Normal clickable button has state interactive and canClick true', () => {
    document.body.innerHTML = `<button id="btn">Click Me</button>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;
    const result = analyzeElement(btn);

    expect(result.interaction.state).toBe('interactive');
    expect(result.interaction.canClick).toBe(true);
    expect(result.interaction.statusLabel).toContain('Interactive');
  });

  // 15. Dynamically added overlay
  it('Interaction 15: Dynamically added overlay is detected on subsequent analysis', () => {
    document.body.innerHTML = `<div id="container"><button id="btn">Target</button></div>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;

    const r1 = analyzeElement(btn);
    expect(r1.interaction.overlay.isCovered).toBe(false);

    // Dynamically insert modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    document.body.appendChild(backdrop);

    const r2 = analyzeElement(btn);
    expect(r2.interaction.overlay.isCovered).toBe(true);
    expect(r2.interaction.state).toBe('not_interactive');
  });

  // 16. Overlay removed
  it('Interaction 16: Removing dynamic overlay restores interactive state', () => {
    document.body.innerHTML = `
      <button id="btn">Target</button>
      <div id="modal" class="modal-backdrop" role="dialog"></div>
    `;
    const btn = document.getElementById('btn') as HTMLButtonElement;

    const r1 = analyzeElement(btn);
    expect(r1.interaction.overlay.isCovered).toBe(true);

    // Remove overlay
    document.getElementById('modal')?.remove();

    const r2 = analyzeElement(btn);
    expect(r2.interaction.overlay.isCovered).toBe(false);
  });

  // 17. Interaction state changes
  it('Interaction 17: MutationObserver watcher detects pointer-events style transitions', async () => {
    document.body.innerHTML = `<button id="btn">Target</button>`;
    const btn = document.getElementById('btn') as HTMLButtonElement;

    let receivedTransition = false;
    let transitionTrigger = '';

    const watcher = new ElementWatcher((event) => {
      receivedTransition = true;
      transitionTrigger = event.trigger;
    });

    watcher.start(btn);

    // Transition pointer-events via style attribute
    btn.setAttribute('style', 'pointer-events: none;');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedTransition).toBe(true);
    expect(transitionTrigger).toContain('pointer-events');
    watcher.stop();
  });

  // 18. ElementPicker disabled button selection
  it('Picker 1: ElementPicker captures clicks on disabled buttons via capture overlay', () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="case2-disabled-btn" class="btn btn-primary" disabled>Disabled Button</button>
      </div>
    `;
    const btn = document.getElementById('case2-disabled-btn') as HTMLButtonElement;

    // In JSDOM, mock elementsFromPoint
    document.elementsFromPoint = (_x: number, _y: number) => {
      const overlay = document.getElementById('whyui-picker-overlay');
      return overlay ? [overlay, btn, document.body, document.documentElement] : [btn];
    };

    let selectedEl: HTMLElement | null = null;
    const picker = new ElementPicker();
    picker.start({
      onSelect: (el) => {
        selectedEl = el;
      },
      onCancel: () => {},
    });

    const overlay = document.getElementById('whyui-picker-overlay');
    expect(overlay).not.toBeNull();

    // Trigger click on the overlay directly (which is what Chromium fires when clicking over disabled controls)
    overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));

    expect(selectedEl).toBe(btn);
  });
});

