import { create } from 'zustand';
import { supabase } from './lib/supabase';
import { MOCK_INBOX_DATA, DEFAULT_PROMPTS_JSON } from './constants';
import { formatJsonMailPayload } from './utils/mailFormat';

// Use environment variable for backend URL, fallback to proxy path for local dev
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.MODE === 'production' ? '' : '');

const EMAILS_TABLE = 'emails';
const PROMPTS_TABLE = 'prompts';

const CATEGORY_RULES = [
  { label: 'Security', patterns: [/security alert/i, /unusual login/i, /verify your account/i, /password/i, /suspicious/i] },
  { label: 'Finance', patterns: [/budget/i, /expense/i, /invoice/i, /payroll/i, /bank/i, /tax/i, /w-4/i] },
  { label: 'Meetings', patterns: [/schedule/i, /meeting/i, /1:?1/i, /review request/i, /availability/i, /book/i] },
  { label: 'HR & Compliance', patterns: [/hr portal/i, /policy/i, /compliance/i, /form/i] },
  { label: 'Operations', patterns: [/database/i, /migration/i, /system restart/i, /patch/i, /maintenance/i] },
  { label: 'Promotions', patterns: [/% off/i, /sale/i, /cart/i, /offer/i, /promotion/i, /discount/i, /newsletter/i, /seo/i] },
  { label: 'Admin', patterns: [/reminder/i, /action required/i, /follow-up/i, /deadline/i] },
];

const normalizeDraftArray = (drafts) =>
  Array.isArray(drafts)
    ? drafts.map((draft) => ({
        ...draft,
        text: formatJsonMailPayload(draft?.text ?? draft),
      }))
    : [];

const hydrateEmailRecord = (record) => {
  if (!record) return record;
  const drafts = normalizeDraftArray(record.drafts);

  return {
    ...record,
    body: formatJsonMailPayload(record.body),
    spam_reason: formatJsonMailPayload(record.spam_reason),
    drafts,
  };
};

function inferCategoryFromEmail(email = {}) {
  const haystack = `${email.subject || ''} ${email.body || ''}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((regex) => regex.test(haystack))) {
      return rule.label;
    }
  }
  if (/friend|family|birthday|party/i.test(haystack)) return 'Personal';
  if (/spam|unsubscribe|lottery/i.test(haystack)) return 'Spam';
  return 'Inbox';
}

async function callLLMProcess(emailBody, categorizationPrompt, actionItemPrompt, schema) {
  const res = await fetch(`${BACKEND_URL}/llm/process-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailBody, categorizationPrompt, actionItemPrompt, schema }),
  });
  if (!res.ok) throw new Error('LLM process request failed');
  return res.json();
}

async function callLLMChat(emailBody, chatInstruction, userQuery) {
  const res = await fetch(`${BACKEND_URL}/llm/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailBody, chatInstruction, userQuery }),
  });
  if (!res.ok) throw new Error('LLM chat request failed');
  return res.json();
}

async function callLLMDetectSpam(emailBody, subject, fromEmail) {
  const res = await fetch(`${BACKEND_URL}/llm/detect-spam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailBody, subject, fromEmail }),
  });
  if (!res.ok) throw new Error('LLM spam detection request failed');
  return res.json();
}

export const useStore = create((set, get) => ({
  emails: [],
  prompts: [],
  loading: false,
  selectedEmails: [], // For multi-select
  isAutoProcessing: false,

  // Fetch all rows from Supabase tables
  fetchData: async () => {
    set({ loading: true });
    const [emailsRes, promptsRes] = await Promise.all([
      supabase.from(EMAILS_TABLE).select('*'),
      supabase.from(PROMPTS_TABLE).select('*'),
    ]);

    if (emailsRes.error) {
      console.error('fetchData emails error', emailsRes.error);
    }
    if (promptsRes.error) {
      console.error('fetchData prompts error', promptsRes.error);
    }

    const emailsData = (emailsRes.data || []).map(hydrateEmailRecord);
    set({ emails: emailsData, prompts: promptsRes.data || [], loading: false });

    const { isAutoProcessing } = get();
    if (!isAutoProcessing && emailsData.length) {
      get()
        .autoProcessPending(emailsData)
        .catch((err) => console.error('autoProcessPending failed', err));
    }
  },

  // Initialize DB with default prompts and mock inbox if empty
  initializeData: async () => {
    set({ loading: true });

    // Check emails
    const { data: emailsData, error: emailsError } = await supabase.from(EMAILS_TABLE).select('id').limit(1);
    if (emailsError) console.error('initializeData check emails error', emailsError);

    if (!emailsData || emailsData.length === 0) {
      // Insert mock inbox rows
      const rows = MOCK_INBOX_DATA.map((m) => ({
        from_email: m.from,
        subject: m.subject,
        body: m.snippet || '',
        category: null,
        action_items: [],
        drafts: [],
        processed: false,
        inserted_at: new Date().toISOString(),
      }));

      const { error: insertErr } = await supabase.from(EMAILS_TABLE).insert(rows);
      if (insertErr) console.error('initializeData insert emails error', insertErr);
    }

    // Check prompts
    const { data: promptsData, error: promptsError } = await supabase.from(PROMPTS_TABLE).select('id').limit(1);
    if (promptsError) console.error('initializeData check prompts error', promptsError);

    if (!promptsData || promptsData.length === 0) {
      // DEFAULT_PROMPTS_JSON is an object of prompt configs
      const promptRows = Object.entries(DEFAULT_PROMPTS_JSON).map(([key, cfg]) => ({
        prompt_type: key,
        prompt_text: cfg.system || cfg.title || '',
        model: cfg.model || 'gemini-2.5-flash',
        response: {},
        created_at: new Date().toISOString(),
      }));

      const { error: pErr } = await supabase.from(PROMPTS_TABLE).insert(promptRows);
      if (pErr) console.error('initializeData insert prompts error', pErr);
    }

    // Refresh local store
    await get().fetchData();
    set({ loading: false });
  },

  // Load mock inbox into local state without persisting to Supabase
  loadMockLocally: async () => {
    set({ loading: true });
    try {
      const rows = MOCK_INBOX_DATA.map((m) => ({
        id: m.id,
        from_email: m.from,
        subject: m.subject,
        body: formatJsonMailPayload(m.snippet || ''),
        inserted_at: new Date().toISOString(),
        category: null,
        action_items: [],
        drafts: [],
        processed: false,
      }));
      set({ emails: rows, loading: false });
      return rows;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  // Replace local emails with provided array (no persistence)
  setEmailsLocal: async (arr) => {
    try {
      const rows = (arr || []).map((m, i) => ({
        id: m.id ?? String(i + 1),
        from_email: m.from_email || m.from || m.sender || 'unknown',
        subject: m.subject || m.title || '(no subject)',
        body: formatJsonMailPayload(m.body || m.snippet || ''),
        inserted_at: m.inserted_at || m.date || new Date().toISOString(),
        category: m.category || null,
        action_items: m.action_items || [],
        drafts: normalizeDraftArray(m.drafts),
        processed: !!m.processed,
      }));
      set({ emails: rows });
      return rows;
    } catch (err) {
      console.error('setEmailsLocal error', err);
      throw err;
    }
  },

  // Update category for a local email (no DB persistence)
  setEmailCategoryLocal: (id, category) => {
    set((state) => ({
      emails: state.emails.map((e) => (e.id === id ? { ...e, category } : e)),
    }));
  },

  // Persist category change to Supabase (update if exists, upsert otherwise)
  persistEmailCategory: async (id, category) => {
    try {
      // Try update first
      const { data, error, status } = await supabase.from(EMAILS_TABLE).update({ category }).eq('id', id).select().single();
      if (error) {
        // If update failed or no rows, attempt upsert
        const up = { id, category, processed: true, updated_at: new Date().toISOString() };
        const { error: upErr } = await supabase.from(EMAILS_TABLE).upsert([up], { onConflict: 'id' });
        if (upErr) throw upErr;
        // Refresh local store
        await get().fetchData();
        return { ok: true };
      }
      // Update local state with returned data
      set((state) => ({ emails: state.emails.map(e => (e.id === id ? { ...e, category } : e)) }));
      return { ok: true, data };
    } catch (err) {
      console.error('persistEmailCategory error', err);
      throw err;
    }
  },

  // Update a prompt row by id
  updatePrompt: async (id, updates) => {
    const { data, error } = await supabase.from(PROMPTS_TABLE).update(updates).eq('id', id).select().single();
    if (error) {
      console.error('updatePrompt error', error);
      throw error;
    }
    // update local state
    set((state) => ({ prompts: state.prompts.map(p => (p.id === id ? data : p)) }));
    return data;
  },

  // Process inbox: process unprocessed emails (or provided ids) through LLM and batch update Supabase
  processInbox: async (emailIds = null, options = {}) => {
    const { silent = false, skipRefresh = false, forceAll = false } = options;
    if (!silent) set({ loading: true });
    try {
      // Fetch emails to process
      let emailsToProcess = [];
      if (Array.isArray(emailIds) && emailIds.length) {
        const { data, error } = await supabase.from(EMAILS_TABLE).select('*').in('id', emailIds);
        if (error) throw error;
        emailsToProcess = data || [];
      } else {
        const query = forceAll
          ? supabase.from(EMAILS_TABLE).select('*')
          : supabase.from(EMAILS_TABLE).select('*').eq('processed', false).limit(50);
        const { data, error } = await query;
        if (error) throw error;
        emailsToProcess = data || [];
      }

      const updates = [];
      for (const em of emailsToProcess) {
        try {
          const result = await callLLMProcess(em.body || em.subject || '', null, null, null);
          // Expect result to be JSON with category and action_items
          const fallbackCategory = inferCategoryFromEmail(em);
          const category = (result && result.category) || fallbackCategory;
          let action_items = [];
          if (result) {
            if (Array.isArray(result.action_items)) action_items = result.action_items;
            else if (result.tasks) action_items = Array.isArray(result.tasks) ? result.tasks : [result.tasks];
          }

          updates.push({ id: em.id, category, action_items, processed: true, processed_at: new Date().toISOString() });
        } catch (err) {
          console.error('processInbox LLM call failed for', em.id, err);
          updates.push({ id: em.id, category: inferCategoryFromEmail(em), processed: true, processed_at: new Date().toISOString() });
        }
      }

      if (updates.length) {
        // batch upsert updates (requires primary key id present)
        const { error } = await supabase.from(EMAILS_TABLE).upsert(updates, { onConflict: 'id' });
        if (error) console.error('processInbox upsert error', error);
      }

      if (!skipRefresh) {
        await get().fetchData();
      }
      if (!silent) set({ loading: false });
      return updates;
    } catch (err) {
      if (!silent) set({ loading: false });
      console.error('processInbox error', err);
      throw err;
    }
  },

  // Chat with agent and optionally save reply as draft to email
  chatWithAgent: async ({ emailId, chatInstruction, userQuery, contextBody }) => {
    set({ loading: true });
    try {
      let emailData = null;
      if (emailId) {
        const { data, error } = await supabase.from(EMAILS_TABLE).select('*').eq('id', emailId).single();
        if (error) throw error;
        emailData = data;
      }

      const resp = await callLLMChat(emailData?.body || contextBody || '', chatInstruction || '', userQuery);
      const draftPayload = resp?.draft?.text ?? resp?.draft ?? resp?.text ?? resp;
      const text = formatJsonMailPayload(draftPayload);
      const suggestedFollowUps = resp?.draft?.suggestedFollowUps || resp?.suggestedFollowUps || [];

      const newDraft = { text, suggestedFollowUps, created_at: new Date().toISOString() };

      if (emailData) {
        const currentDrafts = normalizeDraftArray(emailData.drafts);
        const updatedDrafts = [...currentDrafts, newDraft];
        const { data, error } = await supabase.from(EMAILS_TABLE).update({ drafts: updatedDrafts }).eq('id', emailId).select().single();
        if (error) {
          console.error('chatWithAgent update drafts error', error);
          throw error;
        }

        await get().fetchData();
        set({ loading: false });
        return { draft: newDraft, email: data };
      }

      set({ loading: false });
      return { draft: newDraft, email: null };
    } catch (err) {
      set({ loading: false });
      console.error('chatWithAgent error', err);
      throw err;
    }
  },

  // Detect spam for a single email or all unprocessed emails using Gemini
  detectSpam: async (emailIds = null, options = {}) => {
    const { silent = false, skipRefresh = false, forceAll = false } = options;
    if (!silent) set({ loading: true });
    try {
      let emailsToCheck = [];
      if (Array.isArray(emailIds) && emailIds.length) {
        const { data, error } = await supabase.from(EMAILS_TABLE).select('*').in('id', emailIds);
        if (error) throw error;
        emailsToCheck = data || [];
      } else {
        const query = forceAll
          ? supabase.from(EMAILS_TABLE).select('*')
          : supabase
              .from(EMAILS_TABLE)
              .select('*')
              .or('spam_confidence.is.null,spam_confidence.eq.');
        const { data, error } = await query;
        if (error) throw error;
        emailsToCheck = data || [];
      }

      const updates = [];
      for (const em of emailsToCheck) {
        if (em.category === 'Sent') continue;
        try {
          const result = await callLLMDetectSpam(em.body || '', em.subject || '', em.from_email || '');
          const isSpam = result.isSpam || false;
          const confidence = result.confidence || 0.5;
          const spamReason = result.reason || '';

          // Auto-categorize based on threshold (75%)
          let category = em.category;
          if (confidence >= 0.75 && isSpam) {
            category = 'Spam';
          } else if (confidence >= 0.75 && !isSpam) {
            category = category === 'Spam' ? 'Inbox' : (category || 'Inbox');
          }

          updates.push({ 
            id: em.id, 
            spam_confidence: confidence,
            spam_reason: spamReason,
            category,
            processed: true 
          });
        } catch (err) {
          console.error('detectSpam LLM call failed for', em.id, err);
        }
      }

      if (updates.length) {
        const { error } = await supabase.from(EMAILS_TABLE).upsert(updates, { onConflict: 'id' });
        if (error) console.error('detectSpam upsert error', error);
      }

      if (!skipRefresh) {
        await get().fetchData();
      }
      if (!silent) set({ loading: false });
      return updates;
    } catch (err) {
      if (!silent) set({ loading: false });
      console.error('detectSpam error', err);
      throw err;
    }
  },

  // Toggle email selection for bulk operations
  toggleEmailSelection: (id) => {
    set((state) => {
      const isSelected = state.selectedEmails.includes(id);
      return {
        selectedEmails: isSelected
          ? state.selectedEmails.filter(eId => eId !== id)
          : [...state.selectedEmails, id]
      };
    });
  },

  // Select all emails
  selectAllEmails: () => {
    set((state) => ({ selectedEmails: state.emails.map(e => e.id) }));
  },

  // Deselect all emails
  deselectAllEmails: () => {
    set({ selectedEmails: [] });
  },

  // Bulk mark as spam
  bulkMarkSpam: async () => {
    const { selectedEmails } = get();
    if (!selectedEmails.length) return;
    
    set({ loading: true });
    try {
      const updates = selectedEmails.map(id => ({ id, category: 'Spam' }));
      const { error } = await supabase.from(EMAILS_TABLE).upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      
      await get().fetchData();
      set({ selectedEmails: [], loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  // Bulk process selected emails
  bulkProcess: async () => {
    const { selectedEmails, processInbox } = get();
    if (!selectedEmails.length) return;
    await processInbox(selectedEmails);
    set({ selectedEmails: [] });
  },

  autoProcessPending: async (emailsData) => {
    const { isAutoProcessing } = get();
    if (isAutoProcessing) return;

    const rows = emailsData || get().emails || [];
    const unprocessedIds = rows.filter((e) => e && !e.processed).map((e) => e.id);
    const hasSpamConfidenceColumn = rows.some((row) => row && Object.prototype.hasOwnProperty.call(row, 'spam_confidence'));
    const spamPendingIds = hasSpamConfidenceColumn
      ? rows
          .filter((e) => e && (typeof e.spam_confidence === 'undefined' || e.spam_confidence === null))
          .map((e) => e.id)
      : [];

    if (!unprocessedIds.length && !spamPendingIds.length) return;

    set({ isAutoProcessing: true });
    try {
      if (unprocessedIds.length) {
        await get().processInbox(unprocessedIds, { silent: true, skipRefresh: true });
      }
      if (spamPendingIds.length) {
        await get().detectSpam(spamPendingIds, { silent: true, skipRefresh: true });
      }
      await get().fetchData();
    } catch (err) {
      console.error('autoProcessPending error', err);
    } finally {
      set({ isAutoProcessing: false });
    }
  },

  logSentEmail: async ({ toEmail, subject, body }) => {
    const payload = {
      from_email: 'you@mailfortress.app',
      to_email: toEmail || 'unknown',
      subject: subject || '(no subject)',
      body: formatJsonMailPayload(body || ''),
      category: 'Sent',
      action_items: [],
      drafts: [],
      processed: true,
      processed_at: new Date().toISOString(),
      inserted_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from(EMAILS_TABLE).insert(payload).select().single();
    if (error) {
      console.error('logSentEmail insert error', error);
      throw error;
    }

    set((state) => ({ emails: [hydrateEmailRecord(data), ...state.emails] }));
    return data;
  },

  importEmailsToDatabase: async (emailsArray) => {
    if (!Array.isArray(emailsArray) || !emailsArray.length) {
      throw new Error('No emails to import');
    }

    const rows = emailsArray.map((m, i) => ({
      from_email: m.from_email || m.from || m.sender || 'unknown',
      to_email: m.to_email || m.to || null,
      subject: m.subject || m.title || '(no subject)',
      body: m.body || m.snippet || '',
      category: m.category || null,
      action_items: Array.isArray(m.action_items) ? m.action_items : [],
      drafts: Array.isArray(m.drafts) ? m.drafts : [],
      processed: !!m.processed,
      spam_confidence: m.spam_confidence || null,
      spam_reason: m.spam_reason || null,
      inserted_at: m.inserted_at || m.date || new Date().toISOString(),
      processed_at: m.processed_at || null,
    }));

    const { data, error } = await supabase.from(EMAILS_TABLE).insert(rows).select();
    if (error) {
      console.error('importEmailsToDatabase insert error', error);
      throw error;
    }

    await get().fetchData();
    return data;
  },
}));

export default useStore;
