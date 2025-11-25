export const coerceToPlainText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((entry) => coerceToPlainText(entry?.text ?? entry?.content ?? entry))
      .filter(Boolean)
      .join('\n\n');
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.parts)) {
      return value.parts
        .map((part) => coerceToPlainText(part?.text ?? part))
        .filter(Boolean)
        .join('\n');
    }
    if (value.text) return coerceToPlainText(value.text);
    if (value.content) return coerceToPlainText(value.content);
    try {
      return JSON.stringify(value);
    } catch (err) {
      return '';
    }
  }
  return '';
};

export const normalizeResponseText = (text = '') => {
  const plain = coerceToPlainText(text);
  let normalized = (plain || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .map((line) => {
      // Remove numbered section headers like "**1. Subject Line:**" or "1. Subject Line:"
      line = line.replace(/^\*{0,2}\d+\.\s*[^:]*:\s*\*{0,2}\s*/i, '');
      // Remove standalone asterisk headers like "**ACTION-ORIENTED:**"
      line = line.replace(/^\*{2,}([^*]+)\*{2,}\s*$/i, '$1');
      // Convert bullet markers to uniform dash
      line = line.replace(/^[\s\t]*([*•-])\s+/, '- ');
      return line;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return normalized;
};

export const formatJsonMailPayload = (payload, options = {}) => {
  const { includeSubjectLabel = true } = options;
  if (!payload) return '';

  if (typeof payload === 'string') {
    // Try to unwrap if it's a JSON string
    let unwrapped = payload.trim();
    
    // Strip code fences
    unwrapped = unwrapped.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    
    // Try parsing as JSON
    try {
      const parsed = JSON.parse(unwrapped);
      return formatJsonMailPayload(parsed, options);
    } catch (e) {
      // Not JSON, just normalize the text
      return normalizeResponseText(unwrapped);
    }
  }

  if (Array.isArray(payload)) {
    return normalizeResponseText(
      payload
        .map((item) => formatJsonMailPayload(item, options))
        .filter(Boolean)
        .join('\n\n')
    );
  }

  if (typeof payload !== 'object') {
    return normalizeResponseText(String(payload));
  }

  // Handle Gemini {parts:[{text}], role} wrapper
  if (payload.parts && Array.isArray(payload.parts)) {
    const innerText = payload.parts
      .map(part => formatJsonMailPayload(part.text || part, options))
      .filter(Boolean)
      .join('\n\n');
    return innerText;
  }

  const chunks = [];
  const subjectLine = payload.subject || payload.Subject || payload.title;
  const salutation = payload.salutation || payload.greeting;
  const bodyText = payload.body || payload.message || payload.text;
  const paragraphs = Array.isArray(payload.paragraphs) ? payload.paragraphs : [];
  const closing = payload.closing || payload.signature;

  if (includeSubjectLabel && subjectLine) {
    chunks.push(`Subject: ${subjectLine}`);
  }

  if (salutation) chunks.push(salutation);

  if (bodyText) chunks.push(bodyText);

  if (paragraphs.length) {
    chunks.push(...paragraphs.map((p) => formatJsonMailPayload(p, { includeSubjectLabel: false }))); 
  }

  if (payload.instructions) chunks.push(payload.instructions);

  if (closing) chunks.push(closing);

  if (payload['suggestedFollowUps']) {
    const followUps = payload.suggestedFollowUps;
    if (Array.isArray(followUps) && followUps.length) {
      const label = 'Suggested follow-ups:';
      const items = followUps.map((line) => `- ${coerceToPlainText(line)}`).join('\n');
      chunks.push(`${label}\n${items}`);
    }
  }

  if (!chunks.length) {
    return normalizeResponseText(payload.text || JSON.stringify(payload));
  }

  return normalizeResponseText(chunks.filter(Boolean).join('\n\n'));
};
