import { FormAnalysis, FormFieldDetail } from '../shared/types';

/**
 * Finds the human-readable label for a form control.
 */
function findFieldLabel(control: HTMLElement): string {
  // 1. aria-label
  const ariaLabel = control.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  // 2. aria-labelledby
  const ariaLabelledBy = control.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelledByEl = document.getElementById(ariaLabelledBy);
    if (labelledByEl && labelledByEl.textContent) {
      return labelledByEl.textContent.trim();
    }
  }

  // 3. <label for="...">
  if (control.id) {
    const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(control.id) : control.id.replace(/(["\\])/g, '\\$1');
    const labelEl = document.querySelector(`label[for="${escapedId}"]`);
    if (labelEl && labelEl.textContent) {
      return labelEl.textContent.replace(/\s+/g, ' ').trim();
    }
  }

  // 4. Wrapping <label>
  const parentLabel = control.closest('label');
  if (parentLabel && parentLabel.textContent) {
    return parentLabel.textContent.replace(/\s+/g, ' ').trim();
  }

  // 5. Placeholder or name
  const placeholder = control.getAttribute('placeholder');
  if (placeholder) return placeholder.trim();

  const name = control.getAttribute('name');
  if (name) return name.trim();

  return control.id || control.tagName.toLowerCase();
}

/**
 * Analyzes form associated with the target element.
 */
export function analyzeForm(element: HTMLElement): FormAnalysis {
  // Find associated form
  let form: HTMLFormElement | null = null;

  // Check form attribute first (HTML5 form="..." attribute)
  const formAttr = element.getAttribute('form');
  if (formAttr) {
    const found = document.getElementById(formAttr);
    if (found && found.tagName === 'FORM') {
      form = found as HTMLFormElement;
    }
  }

  // If not found, check closest ancestor form
  if (!form) {
    form = element.closest('form');
  }

  if (!form) {
    return {
      hasForm: false,
      isFormValid: true,
      totalFields: 0,
      invalidFieldsCount: 0,
      requiredFieldsCount: 0,
      fields: [],
    };
  }

  const formId = form.id || undefined;
  const formName = form.getAttribute('name') || undefined;

  let isFormValid = true;
  try {
    isFormValid = typeof form.checkValidity === 'function' ? form.checkValidity() : true;
  } catch {
    // Graceful fallback
  }

  const fields: FormFieldDetail[] = [];
  const processedRadioGroups = new Set<string>();

  const formElements = Array.from(form.elements) as HTMLElement[];

  for (const control of formElements) {
    // Ignore the target element itself
    if (control === element) continue;

    const tagName = control.tagName.toUpperCase();
    const type = (control.getAttribute('type') || (control as any).type || '').toLowerCase();

    // Skip submit/reset/button controls from being considered input fields
    if (tagName === 'BUTTON') continue;
    if (tagName === 'INPUT' && (type === 'submit' || type === 'reset' || type === 'button')) {
      continue;
    }

    const id = control.id || '';
    const name = control.getAttribute('name') || '';
    const label = findFieldLabel(control);
    const required = control.hasAttribute('required') || Boolean((control as any).required);

    // Group radio buttons by name
    if (type === 'radio' && name) {
      if (processedRadioGroups.has(name)) {
        continue;
      }
      processedRadioGroups.add(name);

      const radioGroup = Array.from(form.elements).filter(
        (el) => el.getAttribute('name') === name && el.getAttribute('type') === 'radio'
      ) as HTMLInputElement[];

      const isAnyChecked = radioGroup.some((r) => r.checked);
      const isRequired = radioGroup.some((r) => r.required);
      const isValid = !isRequired || isAnyChecked;

      const statusSummary = isValid
        ? '✓ Valid'
        : '❌ Required - No option selected';

      fields.push({
        id,
        name,
        tagName: 'INPUT (RadioGroup)',
        type: 'radio',
        label,
        required: isRequired,
        valid: isValid,
        valueMissing: isRequired && !isAnyChecked,
        typeMismatch: false,
        patternMismatch: false,
        tooShort: false,
        tooLong: false,
        customError: false,
        validationMessage: isValid ? '' : 'Please select one of these options.',
        statusSummary,
      });

      continue;
    }

    // Constraint validation on HTMLInputElement, HTMLSelectElement, HTMLTextAreaElement
    const inputControl = control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const validity = inputControl.validity || {
      valid: true,
      valueMissing: false,
      typeMismatch: false,
      patternMismatch: false,
      tooShort: false,
      tooLong: false,
      customError: false,
    };

    let isValid = validity.valid;
    let statusSummary = '✓ Valid';

    if (!isValid) {
      if (validity.valueMissing) {
        if (type === 'checkbox') {
          statusSummary = '❌ Required - Not checked';
        } else {
          statusSummary = '❌ Required - Current value empty';
        }
      } else if (validity.typeMismatch) {
        statusSummary = `❌ Invalid format (${type === 'email' ? 'invalid email' : 'type mismatch'})`;
      } else if (validity.patternMismatch) {
        statusSummary = '❌ Pattern mismatch (does not match required format)';
      } else if (validity.tooShort) {
        statusSummary = '❌ Value too short (below minlength)';
      } else if (validity.tooLong) {
        statusSummary = '❌ Value too long (above maxlength)';
      } else if (validity.customError) {
        statusSummary = '❌ Custom validation error';
      } else {
        statusSummary = `❌ Invalid (${inputControl.validationMessage || 'validation failed'})`;
      }
    } else if (required) {
      statusSummary = '✓ Valid';
    }

    fields.push({
      id,
      name,
      tagName,
      type,
      label,
      required,
      valid: isValid,
      valueMissing: Boolean(validity.valueMissing),
      typeMismatch: Boolean(validity.typeMismatch),
      patternMismatch: Boolean(validity.patternMismatch),
      tooShort: Boolean(validity.tooShort),
      tooLong: Boolean(validity.tooLong),
      customError: Boolean(validity.customError),
      validationMessage: inputControl.validationMessage || '',
      statusSummary,
    });
  }

  const invalidFieldsCount = fields.filter((f) => !f.valid).length;
  const requiredFieldsCount = fields.filter((f) => f.required).length;

  return {
    hasForm: true,
    formId,
    formName,
    isFormValid: isFormValid && invalidFieldsCount === 0,
    totalFields: fields.length,
    invalidFieldsCount,
    requiredFieldsCount,
    fields,
  };
}
