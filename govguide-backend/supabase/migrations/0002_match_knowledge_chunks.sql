-- Semantic search over knowledge_chunks using cosine similarity.
-- Run this in the Supabase SQL Editor after 0001_init_schema.sql.

create or replace function match_knowledge_chunks(
  query_embedding vector(768),
  match_count int default 5,
  filter_service_id uuid default null
)
returns table (
  id uuid,
  service_id uuid,
  title text,
  content text,
  source_url text,
  similarity float
)
language sql stable
as $$
  select
    kc.id,
    kc.service_id,
    kc.title,
    kc.content,
    kc.source_url,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where kc.embedding is not null
    and (filter_service_id is null or kc.service_id = filter_service_id or kc.service_id is null)
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;
