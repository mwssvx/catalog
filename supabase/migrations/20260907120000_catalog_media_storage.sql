-- Public bucket for Studio gallery uploads (direct device photos).
-- Safe to re-run. App also auto-creates the bucket via the service role.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-media',
  'catalog-media',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for catalog visitors.
drop policy if exists catalog_media_public_read on storage.objects;
create policy catalog_media_public_read
  on storage.objects
  for select
  using (bucket_id = 'catalog-media');

-- Authenticated owners can manage objects under their shop prefix when using
-- the user client. Service-role signed uploads bypass RLS.
drop policy if exists catalog_media_owner_write on storage.objects;
create policy catalog_media_owner_write
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] = 'shops'
    and (storage.foldername(name))[2] = public.current_shop_id()::text
  )
  with check (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] = 'shops'
    and (storage.foldername(name))[2] = public.current_shop_id()::text
  );
