-- Initialization SQL for MailFortress
-- Creates `emails` and `prompts` tables, indexes, example inserts, and demo queries
-- Copy/paste this into Supabase SQL editor and run.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Emails table
CREATE TABLE IF NOT EXISTS public.emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  from_email text,
  to_email text,
  subject text,
  body text,
  category text,
  action_items jsonb,
  drafts jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  processed boolean DEFAULT false,
  inserted_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_emails_category ON public.emails (category);
CREATE INDEX IF NOT EXISTS idx_emails_inserted_at ON public.emails (inserted_at);
CREATE INDEX IF NOT EXISTS idx_emails_action_items_gin ON public.emails USING gin (action_items);
CREATE INDEX IF NOT EXISTS idx_emails_drafts_gin ON public.emails USING gin (drafts);

-- Prompts table
CREATE TABLE IF NOT EXISTS public.prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES public.emails(id) ON DELETE CASCADE,
  prompt_type text NOT NULL,
  prompt_text text,
  model text,
  response jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompts_email_id ON public.prompts (email_id);

-- Example inserts (safe to run multiple times because rows are always new)
INSERT INTO public.emails (user_id, from_email, to_email, subject, body, category, action_items, drafts, processed, processed_at)
VALUES (
  gen_random_uuid(),
  'sender@example.com',
  'me@example.com',
  'Quarterly review request',
  'Hi — can we schedule a quarterly review next week? Please propose times.',
  'work',
  '[{"title":"Schedule quarterly review","owner":"me@example.com","due":"2025-12-01"},{"title":"Send agenda","owner":"sender@example.com","due":"2025-11-27"}]'::jsonb,
  '[]'::jsonb,
  true,
  now()
);

INSERT INTO public.emails (user_id, from_email, subject, body, category, action_items, drafts)
VALUES (
  gen_random_uuid(),
  'alice@example.com',
  'Please approve invoice',
  'Please approve the attached invoice and cc finance.',
  'finance',
  '["Approve invoice #1234","CC finance team"]'::jsonb,
  '[{"text":"Draft reply: Thanks, I approved invoice #1234.","created_at": "2025-11-24T10:00:00Z"}]'::jsonb
);

-- Example prompt record linked to the most recently inserted email
INSERT INTO public.prompts (email_id, prompt_type, prompt_text, model, response)
VALUES (
  (SELECT id FROM public.emails ORDER BY inserted_at DESC LIMIT 1),
  'categorization',
  'Categorize this email into one of: personal|work|spam|finance',
  'gemini-2.5-flash',
  '{"category":"finance","confidence":0.92}'::jsonb
);

-- Copy-paste-ready queries (no placeholders)

-- 1) List recent emails
SELECT id, subject, category, inserted_at FROM public.emails ORDER BY inserted_at DESC LIMIT 10;

-- 2) Show action items for the most recent email (expands JSON array)
SELECT id, category, jsonb_array_elements(action_items) AS action_item
FROM public.emails
WHERE id = (SELECT id FROM public.emails ORDER BY inserted_at DESC LIMIT 1);

-- 3) Show drafts and count for the most recent email
SELECT id, drafts, jsonb_array_length(drafts) AS drafts_count
FROM public.emails
WHERE id = (SELECT id FROM public.emails ORDER BY inserted_at DESC LIMIT 1);

-- 4) Example: select emails in 'work' category
SELECT id, subject, inserted_at FROM public.emails WHERE category = 'work' ORDER BY inserted_at DESC LIMIT 50;

-- Optional: Basic RLS policies (enable only if you plan to use Supabase Auth)
-- Uncomment and adjust if you use auth.uid() mapping
-- ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Emails: insert own" ON public.emails
--   FOR INSERT USING (auth.uid() IS NOT NULL)
--   WITH CHECK (auth.uid() = user_id);
