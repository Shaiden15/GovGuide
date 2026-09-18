-- Ranked full-text search over faq_entries, so the best-matching answer
-- surfaces first instead of any loosely-matching row in arbitrary order.

create or replace function search_faq_entries(
  tsquery_string text,
  filter_service_id uuid default null,
  match_count int default 5
)
returns table (
  id uuid,
  question text,
  answer text,
  source_url text,
  service_id uuid,
  rank real
)
language sql stable
as $$
  select
    f.id,
    f.question,
    f.answer,
    f.source_url,
    f.service_id,
    ts_rank(f.search, to_tsquery('english', tsquery_string)) as rank
  from faq_entries f
  where f.search @@ to_tsquery('english', tsquery_string)
    and (filter_service_id is null or f.service_id = filter_service_id or f.service_id is null)
  order by rank desc
  limit match_count;
$$;
