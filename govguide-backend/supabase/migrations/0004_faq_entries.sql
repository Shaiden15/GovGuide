-- V1 (AI-free) FAQ table — plain text search, no embeddings, no AI required.
-- Replaces the semantic-search role that knowledge_chunks played for chat.

create table if not exists faq_entries (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services (id) on delete cascade, -- nullable = general FAQ
  question text not null,
  answer text not null,
  language text not null default 'en',
  source_url text,
  last_verified date,
  search tsvector generated always as (
    to_tsvector('english', coalesce(question, '') || ' ' || coalesce(answer, ''))
  ) stored,
  created_at timestamptz not null default now()
);

create index if not exists faq_entries_search_idx on faq_entries using gin (search);
create index if not exists faq_entries_service_id_idx on faq_entries (service_id);

alter table faq_entries enable row level security;
create policy "faq_entries_public_read" on faq_entries for select using (true);
-- No write policies for anon/authenticated — the backend writes via the service role key.
