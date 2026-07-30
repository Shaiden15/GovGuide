-- GovGuide SA — initial schema
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run)

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- pgvector, for knowledge_chunks.embedding

-- ============================================================
-- Identity
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now()
);

-- ============================================================
-- Service catalog (structured reference data)
-- ============================================================
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  department text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists requirements (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete cascade,
  doc_type text not null,
  description text,
  mandatory boolean not null default true,
  notes text
);
create index if not exists requirements_service_id_idx on requirements (service_id);

create table if not exists eligibility_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete cascade,
  rule_type text not null,
  condition text not null,
  value text
);
create index if not exists eligibility_rules_service_id_idx on eligibility_rules (service_id);

create table if not exists rejection_reasons (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete cascade,
  reason_code text not null,
  description text,
  fix_instructions text
);
create index if not exists rejection_reasons_service_id_idx on rejection_reasons (service_id);

-- ============================================================
-- RAG / AI context
-- ============================================================
create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services (id) on delete cascade, -- nullable = general knowledge
  title text,
  content text not null,
  embedding vector(768), -- Gemini text-embedding-004 dimension
  source_url text,
  language text not null default 'en',
  last_verified date,
  created_at timestamptz not null default now()
);
create index if not exists knowledge_chunks_service_id_idx on knowledge_chunks (service_id);
create index if not exists knowledge_chunks_embedding_idx
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================================
-- Interaction / session data
-- ============================================================
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid references services (id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists sessions_user_id_idx on sessions (user_id);
create index if not exists sessions_service_id_idx on sessions (service_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_session_id_idx on messages (session_id);

create table if not exists documents_uploaded (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references sessions (id) on delete set null,
  file_url text not null,
  doc_type_detected text,
  checked_at timestamptz
);
create index if not exists documents_uploaded_user_id_idx on documents_uploaded (user_id);
create index if not exists documents_uploaded_session_id_idx on documents_uploaded (session_id);

create table if not exists document_analyses (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents_uploaded (id) on delete cascade,
  extracted_text text,
  analysis jsonb,
  created_at timestamptz not null default now()
);
create index if not exists document_analyses_document_id_idx on document_analyses (document_id);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists feedback_session_id_idx on feedback (session_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table messages enable row level security;
alter table documents_uploaded enable row level security;
alter table document_analyses enable row level security;
alter table feedback enable row level security;

alter table services enable row level security;
alter table requirements enable row level security;
alter table eligibility_rules enable row level security;
alter table rejection_reasons enable row level security;
alter table knowledge_chunks enable row level security;

-- Owned tables: users can only see/manage their own rows
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

create policy "sessions_all_own" on sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages_select_own" on messages for select
  using (exists (select 1 from sessions s where s.id = messages.session_id and s.user_id = auth.uid()));
create policy "messages_insert_own" on messages for insert
  with check (exists (select 1 from sessions s where s.id = messages.session_id and s.user_id = auth.uid()));

create policy "documents_uploaded_all_own" on documents_uploaded for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "document_analyses_select_own" on document_analyses for select
  using (exists (
    select 1 from documents_uploaded d
    where d.id = document_analyses.document_id and d.user_id = auth.uid()
  ));

create policy "feedback_all_own" on feedback for all
  using (exists (select 1 from sessions s where s.id = feedback.session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = feedback.session_id and s.user_id = auth.uid()));

-- Reference tables: public read, writes restricted to service role (backend only)
create policy "services_public_read" on services for select using (true);
create policy "requirements_public_read" on requirements for select using (true);
create policy "eligibility_rules_public_read" on eligibility_rules for select using (true);
create policy "rejection_reasons_public_read" on rejection_reasons for select using (true);
create policy "knowledge_chunks_public_read" on knowledge_chunks for select using (true);
-- No insert/update/delete policies on reference tables for anon/authenticated roles;
-- the backend writes to them using the Supabase service role key, which bypasses RLS.

-- ============================================================
-- Auto-create a profile row whenever a new auth user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Seed the 6 initial services
-- ============================================================
insert into services (slug, name, department, description) values
  ('nsfas', 'NSFAS', 'Department of Higher Education', 'Student funding applications and appeals'),
  ('id-application', 'ID Application', 'Department of Home Affairs', 'South African ID applications'),
  ('passport', 'Passport', 'Department of Home Affairs', 'Passport applications and renewals'),
  ('social-grant', 'Social Grant', 'SASSA', 'Old Age, Disability, Child Support, SRD grants'),
  ('business-registration', 'Business Registration', 'CIPC', 'Business registration, annual returns, name reservations'),
  ('uif', 'UIF', 'Department of Labour', 'Unemployment insurance claims')
on conflict (slug) do nothing;
