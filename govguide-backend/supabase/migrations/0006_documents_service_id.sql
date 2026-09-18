-- Documents are now uploaded directly against a service (no chat session needed).
alter table documents_uploaded add column if not exists service_id uuid references services (id) on delete set null;
create index if not exists documents_uploaded_service_id_idx on documents_uploaded (service_id);
