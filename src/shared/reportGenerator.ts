import { ElementAnalysis } from './types';

/**
 * Mask potentially sensitive strings (passwords, tokens, emails, phone numbers, secret keys).
 */
export function maskSensitiveText(text: string): string {
  if (!text) return '';
  // Mask email addresses
  const maskedEmail = text.replace(/([a-zA-Z0-9_\-.]+)@([a-zA-Z0-9_\-.]+)/g, (_match, user, domain) => {
    const maskedUser = user.length > 2 ? `${user.slice(0, 1)}***${user.slice(-1)}` : '***';
    return `${maskedUser}@${domain}`;
  });
  // Mask token-like or secret-like strings
  return maskedEmail.replace(/(token|secret|password|auth|bearer)[\s:=]+([^\s]+)/gi, '$1=***');
}

/**
 * Generate a clean, developer-friendly Markdown report for GitHub issues, Slack, or debugging.
 */
export function generateMarkdownReport(analysis: ElementAnalysis): string {
  const target = analysis.target;
  const tagDesc = `${target.tagName.toLowerCase()}${target.id ? ` id="${target.id}"` : ''}${
    target.classes.length > 0 ? ` class="${target.classes.join(' ')}"` : ''
  }`;

  const confirmedExplanations = analysis.explanations.filter((e) => e.confidence === 'confirmed');
  const likelyExplanations = analysis.explanations.filter((e) => e.confidence === 'likely');
  const possibleExplanations = analysis.explanations.filter((e) => e.confidence === 'possible');

  const lines: string[] = [];
  lines.push('## WhyUI Report');
  lines.push('');
  lines.push('### Selected Element');
  lines.push('```html');
  lines.push(`<${tagDesc}>`);
  lines.push('```');
  lines.push('');

  // Interaction Status
  const interactionLabel = analysis.interaction?.statusLabel || (analysis.primaryStatus === 'enabled' ? '🟢 Interactive' : '🔴 Not clickable');
  lines.push('### Interaction Status');
  lines.push(interactionLabel);
  lines.push(`Status: ${analysis.primaryStatus.toUpperCase()}`);
  lines.push('');

  if (confirmedExplanations.length > 0) {
    lines.push('### Confirmed reasons');
    for (const exp of confirmedExplanations) {
      lines.push(`- **${exp.title}**: ${exp.description}`);
      if (exp.evidence.length > 0) {
        for (const ev of exp.evidence) {
          lines.push(`  • ${ev}`);
        }
      }
    }
    lines.push('');
  }

  if (likelyExplanations.length > 0) {
    lines.push('### Likely contributing factors');
    for (const exp of likelyExplanations) {
      lines.push(`- **${exp.title}**: ${exp.description}`);
      if (exp.evidence.length > 0) {
        for (const ev of exp.evidence) {
          lines.push(`  • ${ev}`);
        }
      }
    }
    lines.push('');
  }

  if (possibleExplanations.length > 0) {
    lines.push('### Related conditions (Possible)');
    for (const exp of possibleExplanations) {
      lines.push(`- **${exp.title}**: ${exp.description}`);
      if (exp.evidence.length > 0) {
        for (const ev of exp.evidence) {
          lines.push(`  • ${ev}`);
        }
      }
    }
    lines.push('');
  }

  // Blocking Element details if covered
  if (analysis.overlay.isCovered && analysis.overlay.coveringElement) {
    const cov = analysis.overlay.coveringElement;
    lines.push('### Blocking Element');
    lines.push('```html');
    lines.push(cov.outerHTMLSnippet || `<${cov.selector}>`);
    lines.push('```');
    if (cov.rect && analysis.overlay.targetRect) {
      lines.push(`- Target bounding box: x = ${analysis.overlay.targetRect.x}, y = ${analysis.overlay.targetRect.y}, width = ${analysis.overlay.targetRect.width}, height = ${analysis.overlay.targetRect.height}`);
      lines.push(`- Blocking bounding box: x = ${cov.rect.x}, y = ${cov.rect.y}, width = ${cov.rect.width}, height = ${cov.rect.height}`);
      lines.push(`- Stacking z-index: Target: ${analysis.overlay.targetZIndex || 'auto'}, Blocking: ${cov.zIndex || 'auto'}`);
    }
    if (analysis.overlay.intersectedPoints.length > 0) {
      lines.push(`- Intersected points: ${analysis.overlay.intersectedPoints.join(', ')}`);
    }
    lines.push('');
  }

  // Interaction Chain
  if (analysis.interaction?.interactionChain && analysis.interaction.interactionChain.length > 1) {
    lines.push('### Interaction Chain');
    lines.push('```text');
    const chain = analysis.interaction.interactionChain;
    chain.forEach((node, idx) => {
      const indent = '  '.repeat(idx);
      const isLeaf = idx === chain.length - 1;
      const marker = isLeaf ? ' ← selected' : node.isBlocking ? ` [BLOCKED: ${node.blockingReason || 'non-interactive'}]` : '';
      lines.push(`${indent}└── <${node.selector}>${marker}`);
    });
    lines.push('```');
    lines.push('');
  }

  // Form Context
  if (analysis.form.hasForm) {
    lines.push('### Form Context');
    lines.push(`- Form: \`${analysis.form.formId ? `#${analysis.form.formId}` : '<form>'}\``);
    lines.push(`- Form checkValidity: ${analysis.form.isFormValid ? 'Valid' : 'Invalid'}`);
    if (analysis.form.invalidFieldsCount > 0) {
      lines.push(`- Invalid fields (${analysis.form.invalidFieldsCount}):`);
      for (const field of analysis.form.fields.filter((f) => !f.valid)) {
        lines.push(`  • ${field.label || field.name || field.id || field.tagName}: ${field.statusSummary}`);
      }
    }
    lines.push('');
  }

  if (analysis.framework.detected) {
    lines.push('### Framework');
    lines.push(`- ${analysis.framework.name || 'Detected'} (${analysis.framework.details || 'Browser heuristics'})`);
    lines.push('');
  }

  // Environment & Privacy
  lines.push('### Environment & Privacy');
  lines.push(`- Page: ${analysis.url}`);
  lines.push(`- Browser: Microsoft Edge`);
  lines.push(`- Timestamp: ${analysis.timestamp}`);
  lines.push(`- Privacy: Sensitive form values were excluded.`);
  lines.push('');
  lines.push('---');
  lines.push('*Report generated by [WhyUI](https://github.com/SkyDevLab/WhyUI) by SkyDevLab*');

  return lines.join('\n');
}
