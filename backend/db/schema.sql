-- Emails table example
create extension if not exists "pgcrypto";

create table if not exists emails (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  from_email text not null,
  subject text not null,
  body text,
  category text,
  action_items jsonb default '[]'::jsonb,
  drafts jsonb default '[]'::jsonb,
  processed boolean default false,
  processed_at timestamptz,
  spam_confidence numeric(3,2), -- 0.00 to 1.00
  spam_reason text,
  received_at timestamptz default now(),
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_read boolean default false
);

-- Example RLS policy (enable RLS and adapt to your auth setup)
-- alter table emails enable row level security;
-- create policy "Users can view their emails" on emails
--   for select using (auth.uid() = user_id::text);
