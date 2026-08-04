-- V1 is AI-free for chat/search — drop the semantic-search plumbing that's no longer used.
-- Document Checker and Rejection Analyzer are unaffected; they don't use these objects.

drop function if exists match_knowledge_chunks(vector, int, uuid);
drop table if exists knowledge_chunks;
