require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

// This simplified server is only responsible for LLM (Gemini) calls.
// It intentionally does NOT include any database or Supabase logic.

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3001;

// The server expects an API key for the Gemini/Generative Language API in env:
// - GENAI_API_KEY or GEMINI_API_KEY or GOOGLE_API_KEY
const GENAI_API_KEY = process.env.GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!GENAI_API_KEY) {
  console.warn('Warning: LLM API key not found in env (GENAI_API_KEY or GEMINI_API_KEY or GOOGLE_API_KEY).');
  // We do not exit so the server can still run in dev with limited behavior.
}

// Helper: normalize AI output for consistent email formatting
function formatEmailResponse(raw) {
  if (!raw) return '';

  const normalized = String(raw)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => {
      const trimmedEnd = line.trimEnd();
      const bulletMatch = trimmedEnd.trimStart().match(/^(?:[-*•])\s+(.*)$/);
      if (bulletMatch) {
        return `- ${bulletMatch[1].trim()}`;
      }
      return trimmedEnd;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return normalized;
}

function buildStructuredEmail(data = {}) {
  const subjectLine = data.subjectLine || data.subject || '[ACTION/TOPIC]: [Brief Context/Document ID/Urgency]';
  const salutation = data.salutation || 'Dear [Recipient Name],';
  const openingSentence = data.openingSentence || 'I am writing to provide an update on the current request.';
  const bodyParagraphs = Array.isArray(data.bodyParagraphs)
    ? data.bodyParagraphs.filter(Boolean)
    : (data.bodyParagraph ? [data.bodyParagraph] : []);
  const bulletPoints = Array.isArray(data.bulletPoints)
    ? data.bulletPoints.filter(Boolean)
    : [];
  const callToAction = data.callToAction || 'Please review this information and let me know how you would like to proceed.';
  const closingStatement = data.closingStatement || 'Thank you for your time and prompt assistance.';
  const signOff = data.signOff || 'Best regards,';
  const signatureBlock = Array.isArray(data.signatureBlock)
    ? data.signatureBlock.filter(Boolean)
    : (data.signatureBlock ? [data.signatureBlock] : ['[Your Full Name]', '[Your Title]', '[Your Company/Department]']);

  const lines = [];
  const pushBlank = () => {
    if (lines[lines.length - 1] !== '') lines.push('');
  };

  lines.push('**1. Subject Line (ACTION-ORIENTED):**');
  lines.push(subjectLine.trim());
  pushBlank();

  lines.push('**2. Salutation:**');
  lines.push(salutation.trim());
  pushBlank();

  lines.push('**3. Opening Sentence (Direct Purpose):**');
  lines.push(openingSentence.trim());
  pushBlank();

  lines.push('**4. Body Paragraph(s) (Details and Context):**');
  if (bodyParagraphs.length) {
    bodyParagraphs.forEach((para) => {
      lines.push(para.trim());
      pushBlank();
    });
  } else {
    lines.push('Provide relevant background and current status here.');
    pushBlank();
  }

  if (bulletPoints.length) {
    bulletPoints.forEach((item) => {
      lines.push(`- ${item.trim()}`);
    });
    pushBlank();
  }

  lines.push('**5. Call to Action (CTA) / Next Steps:**');
  lines.push(callToAction.trim());
  pushBlank();

  lines.push('**6. Closing Statement:**');
  lines.push(closingStatement.trim());
  pushBlank();

  lines.push('**7. Sign-Off:**');
  lines.push(signOff.trim());
  pushBlank();

  lines.push('**8. Signature Block:**');
  signatureBlock.forEach((line) => lines.push(line.trim()));

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Helper: unified Gemini call utility. Tries SDK first, then REST fallback.
async function callGemini(prompt, options = {}) {
  if (!GENAI_API_KEY) throw new Error('GENAI API key is not set in server environment');

  // Try SDK if available
  try {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GENAI_API_KEY });
    const model = options.model || 'gemini-2.5-flash';
    const contents = Array.isArray(prompt) ? prompt : [ { type: 'text', text: String(prompt) } ];
    const payload = { model, contents };
    if (options.maxOutputTokens) payload.maxOutputTokens = options.maxOutputTokens;
    if (typeof options.temperature !== 'undefined') payload.temperature = options.temperature;

    const resp = await ai.models.generateContent(payload);
    // Normalize response to text
    let text = '';
    try {
      if (resp?.output && Array.isArray(resp.output) && resp.output.length) {
        // output pieces
        text = resp.output.map(o => o.content || o.text || JSON.stringify(o)).join('\n');
      } else if (resp?.candidates && resp.candidates.length) {
        text = resp.candidates[0].output ?? resp.candidates[0].content ?? JSON.stringify(resp.candidates[0]);
      } else if (resp?.text) {
        text = resp.text;
      } else {
        text = JSON.stringify(resp).slice(0, 2000);
      }
    } catch (e) {
      text = JSON.stringify(resp).slice(0, 2000);
    }

    return text;
  } catch (sdkErr) {
    // SDK not available or failed; fall back to REST
  }

  // REST fallback (v1 or v1beta2)
  const modelId = options.model || 'text-bison-001';
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1/models/${modelId}:generate`,
    `https://generativelanguage.googleapis.com/v1beta2/models/${modelId}:generate`,
  ];

  const body = {
    prompt: { text: String(prompt) },
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.2,
    maxOutputTokens: options.maxOutputTokens || 512,
  };

  for (const url of endpoints) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      const text = await r.text();
      if (!r.ok) {
        // try next endpoint
        continue;
      }

      let data;
      try { data = JSON.parse(text); } catch (e) { data = text; }
      // Normalize common shapes
      if (data?.candidates && data.candidates.length) {
        const c = data.candidates[0];
        return c.output ?? c.content ?? c.text ?? JSON.stringify(c);
      }
      if (data?.output && Array.isArray(data.output)) {
        return data.output.map(p => p.content || p.text || JSON.stringify(p)).join('\n');
      }
      if (typeof data === 'string') return data;
      return JSON.stringify(data);
    } catch (err) {
      // try next endpoint
    }
  }

  throw new Error('All Gemini endpoints failed');
}

// Route: health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// POST /llm/process-email
// Body: { emailBody, categorizationPrompt, actionItemPrompt, schema }
// Returns: { category: string, action_items: Array }
app.post('/llm/process-email', async (req, res) => {
  try {
    const { emailBody, categorizationPrompt, actionItemPrompt, schema } = req.body;
    if (!emailBody) return res.status(400).json({ error: 'emailBody is required' });

    // Build a combined prompt that asks the model to return a JSON object
    const promptParts = [];
    if (categorizationPrompt) promptParts.push(`Categorize the following email:\n\n${categorizationPrompt}`);
    if (actionItemPrompt) promptParts.push(`Extract action items from the following email:\n\n${actionItemPrompt}`);
    promptParts.push(`Email body:\n${emailBody}`);

    // If a JSON schema is provided, instruct the model to follow it
    let schemaInstruction = '';
    if (schema) {
      schemaInstruction = `Return ONLY valid JSON that matches this schema: ${JSON.stringify(schema)}.`;
    } else {
      schemaInstruction = 'Return ONLY a JSON object with fields: "category" (string) and "action_items" (array of objects or strings).';
    }

    const combinedPrompt = `${promptParts.join('\n\n')}\n\n${schemaInstruction}\n\nRespond with JSON only.`;

    const text = await callGemini(combinedPrompt, { temperature: 0.0, maxOutputTokens: 800 });

    // Attempt to parse JSON from model output
    let parsed;
    try {
      // Some models wrap JSON in backticks or triple backticks; strip common wrappers
      const cleaned = text.replace(/^\s*```json\s*/, '').replace(/\s*```\s*$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (err) {
      // Fallback: return raw text with an error flag
      return res.status(200).json({ warning: 'failed to parse JSON - returning raw text', raw: text });
    }

    return res.json(parsed);
  } catch (err) {
    console.error('/llm/process-email error', err);
    return res.status(500).json({ error: String(err) });
  }
});

// POST /llm/chat
// Body: { emailBody, chatInstruction, userQuery }
// Returns: { text: string, suggestedFollowUps: Array }
app.post('/llm/chat', async (req, res) => {
  try {
    const { emailBody, chatInstruction, userQuery } = req.body;
    if (!userQuery) return res.status(400).json({ error: 'userQuery is required' });

    const prompt = `${chatInstruction ? chatInstruction + '\n\n' : ''}Context (email):\n${emailBody || ''}\n\nUser Query:\n${userQuery}\n\nPlease answer concisely and also suggest 2-3 relevant follow-up actions or questions. Return as JSON with fields: "text" (your response) and "suggestedFollowUps" (array of strings).`;

    const text = await callGemini(prompt, { temperature: 0.2, maxOutputTokens: 1024 });

    // Try to parse JSON response
    try {
      const cleaned = text.replace(/^\s*```json\s*/, '').replace(/\s*```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned);
      return res.json(parsed);
    } catch (parseErr) {
      // Fallback: return raw text without structured follow-ups
      console.log('/llm/chat: Failed to parse JSON, returning plain text');
      return res.json({ text: text, suggestedFollowUps: [] });
    }
  } catch (err) {
    console.error('/llm/chat error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

// POST /llm/detect-spam
// Body: { emailBody, subject, fromEmail }
// Returns: { isSpam: boolean, confidence: number (0-1), reason: string }
app.post('/llm/detect-spam', async (req, res) => {
  try {
    const { emailBody, subject, fromEmail } = req.body;
    if (!emailBody && !subject) return res.status(400).json({ error: 'emailBody or subject is required' });

    const prompt = `Analyze this email for spam indicators:

From: ${fromEmail || 'unknown'}
Subject: ${subject || '(no subject)'}
Body: ${emailBody || ''}

Determine if this is spam/unwanted email. Consider:
- Promotional language, urgency tactics
- Suspicious links or requests for personal info
- Generic greetings, poor grammar
- Offers that seem too good to be true
- Sender reputation

Return ONLY valid JSON with:
{
  "isSpam": boolean,
  "confidence": number between 0 and 1,
  "reason": "brief explanation"
}`;

    const text = await callGemini(prompt, { temperature: 0.0, maxOutputTokens: 300 });

    // Parse JSON from model output
    let parsed;
    try {
      const cleaned = text.replace(/^\s*```json\s*/, '').replace(/\s*```\s*$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (err) {
      // Fallback: return conservative default
      return res.json({ isSpam: false, confidence: 0.5, reason: 'Failed to parse spam detection result' });
    }

    return res.json(parsed);
  } catch (err) {
    console.error('/llm/detect-spam error', err);
    return res.status(500).json({ error: String(err) });
  }
});

// POST /llm/generate-response
// Body: { fromEmail, subject, emailBody }
// Returns: { responseText: string }
app.post('/llm/generate-response', async (req, res) => {
  try {
    const { fromEmail, subject, emailBody } = req.body;
    if (!emailBody && !subject) return res.status(400).json({ error: 'emailBody or subject is required' });

    const prompt = `You are an intelligent email assistant. Read the following email and generate a professional, formatted response.

Original Email:
From: ${fromEmail || 'unknown sender'}
Subject: ${subject || '(no subject)'}
Message:
${emailBody || '(no content)'}

Task: Draft a response that exactly matches this eight-part structure:
1. Subject Line (ACTION-ORIENTED)
2. Salutation
3. Opening Sentence (direct purpose)
4. Body Paragraph(s) with optional bullet list for detailed items
5. Call to Action / Next Steps
6. Closing Statement
7. Sign-Off
8. Signature Block (list of lines, e.g., name, role, org)

Return ONLY valid JSON (no prose, no markdown) in this shape:
{
  "subjectLine": "[ACTION/TOPIC]: ...",
  "salutation": "Dear ...",
  "openingSentence": "I am writing to ...",
  "bodyParagraphs": ["paragraph one", "paragraph two"],
  "bulletPoints": ["detail 1", "detail 2"],
  "callToAction": "Please ...",
  "closingStatement": "Thank you ...",
  "signOff": "Best regards,",
  "signatureBlock": ["Your Name", "Your Title", "Company"]
}

Each array must contain at least one entry. If information is missing, use professional placeholders.`;

    const raw = await callGemini(prompt, { temperature: 0.3, maxOutputTokens: 600 });

    let structuredText;
    try {
      const cleaned = String(raw).replace(/^\s*```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      structuredText = buildStructuredEmail(parsed);
    } catch (parseErr) {
      console.warn('/llm/generate-response: JSON parse failed, falling back to raw text', parseErr);
      let text = raw;
      if (typeof text !== 'string') {
        try {
          text = JSON.stringify(text);
        } catch (e) {
          text = String(text);
        }
      }
      structuredText = text;
    }

    return res.json({ responseText: formatEmailResponse(structuredText) });
  } catch (err) {
    console.error('/llm/generate-response error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => console.log(`LLM server running on http://localhost:${PORT}`));
