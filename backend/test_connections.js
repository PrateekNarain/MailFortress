require('dotenv').config();
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const GENAI_API_KEY = process.env.GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const dns = require('dns').promises;

async function testGenAI() {
  console.log('--- GenAI (Gemini) API test ---');
  if (!GENAI_API_KEY) {
    console.error('GENAI_API_KEY is not set in environment. Skipping GenAI test.');
    return { ok: false, reason: 'no_api_key' };
  }

  // First try the official SDK usage if available (@google/genai)
  try {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GENAI_API_KEY });
    console.log('Using @google/genai SDK to generate a short response.');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Respond with exactly: PONG',
      });
      // SDK response shape may vary; pull text if present
      const text = response?.output?.[0]?.content || response?.candidates?.[0]?.output || response?.text || JSON.stringify(response).slice(0, 400);
      console.log('GenAI SDK response snippet:', text);
      return { ok: true, output: text, method: 'sdk' };
    } catch (sdkErr) {
      console.warn('@google/genai SDK call failed:', sdkErr?.message || sdkErr);
      // fall through to REST attempts
    }
  } catch (err) {
    console.warn('Could not load @google/genai SDK, falling back to REST endpoints:', err?.message || err);
  }

  // Fallback: try a list of known REST endpoints (v1 then v1beta2)
  const endpoints = [
    'https://generativelanguage.googleapis.com/v1/models/text-bison-001:generate',
    'https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate',
  ];

  const body = {
    prompt: { text: 'Respond with exactly: PONG' },
    temperature: 0,
    maxOutputTokens: 10,
  };

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      if (!res.ok) {
        console.error(`GenAI request to ${url} failed: ${res.status} ${res.statusText} - ${text}`);
        // try next endpoint
        continue;
      }

      // Try to parse JSON and extract a readable snippet
      let data;
      try { data = JSON.parse(text); } catch (e) { data = text; }
      let out = '';
      if (data?.candidates && data.candidates.length) {
        out = data.candidates[0].output ?? data.candidates[0].content ?? JSON.stringify(data.candidates[0]);
      } else if (data?.output && data.output.length) {
        out = data.output.map(p => p.content || p.text || JSON.stringify(p)).join('\n');
      } else if (typeof data === 'string') {
        out = data.slice(0, 400);
      } else {
        out = JSON.stringify(data).slice(0, 400);
      }

      console.log('GenAI response snippet:', out);
      return { ok: true, output: out, endpoint: url };
    } catch (err) {
      console.error(`GenAI request error to ${url}:`, err.message || err);
      // try next endpoint
    }
  }

  return { ok: false, reason: 'all_endpoints_failed' };
}

async function testSupabase() {
  console.log('\n--- Supabase connection test ---');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in environment. Skipping Supabase test.');
    return { ok: false, reason: 'no_supabase_env' };
  }
  // First do a DNS lookup of the host to give a clear diagnostic for ENOTFOUND
  try {
    const u = new URL(SUPABASE_URL);
    const hostname = u.hostname;
    console.log('Resolving Supabase hostname:', hostname);
    try {
      const lookup = await dns.lookup(hostname);
      console.log('DNS lookup:', lookup);
    } catch (dnsErr) {
      console.error('DNS lookup failed for Supabase host:', dnsErr.message || dnsErr);
      return { ok: false, reason: 'dns_lookup_failed', error: String(dnsErr) };
    }
  } catch (urlErr) {
    console.error('Invalid SUPABASE_URL format:', urlErr.message || urlErr);
    return { ok: false, reason: 'invalid_supabase_url', error: String(urlErr) };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: { headers: { 'x-client-info': 'test-connections-script' } } });

  try {
    // Try admin list users (works with service_role key). If not allowed, try a basic table query.
    if (supabase.auth && supabase.auth.admin && typeof supabase.auth.admin.listUsers === 'function') {
      const resp = await supabase.auth.admin.listUsers({ per_page: 1 });
      console.log('Supabase admin.listUsers response keys:', Object.keys(resp || {}).join(', '));
      return { ok: true, method: 'auth.admin.listUsers', result: resp };
    }

    // Fallback: attempt a simple select from `emails` (may not exist in the project)
    const { data, error } = await supabase.from('emails').select('*').limit(1);
    if (error) {
      console.error('Supabase select error (emails):', error.message || error);
      return { ok: false, error };
    }
    console.log('Supabase emails query returned rows:', Array.isArray(data) ? data.length : 0);
    return { ok: true, method: 'from(emails).select', rows: data };
  } catch (err) {
    console.error('Supabase test error:', err.message || err);
    return { ok: false, error: String(err) };
  }
}

async function main() {
  console.log('Running connection tests.');
  const genai = await testGenAI();
  const supa = await testSupabase();

  console.log('\nSummary:');
  console.log('GenAI:', genai.ok ? 'OK' : 'FAIL', genai.ok ? '' : genai);
  console.log('Supabase:', supa.ok ? 'OK' : 'FAIL', supa.ok ? '' : supa);

  // exit code: 0 if both ok, 1 otherwise
  const success = genai.ok && supa.ok;
  process.exit(success ? 0 : 1);
}

main();
