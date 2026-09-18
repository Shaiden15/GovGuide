-- Storage bucket for uploaded documents (IDs, payslips, rejection letters, etc.)
-- Private bucket — files are only reachable via signed URLs or the service role key.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Users may only read/write objects under a folder named after their own user id,
-- e.g. documents/<user_id>/<filename>.
create policy "documents_select_own_folder"
  on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents_insert_own_folder"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents_delete_own_folder"
  on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
