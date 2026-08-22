-- Media pipeline: S3 keys, upload lifecycle, private drafts, public promotion.

alter table public.media
  add column if not exists owner_id uuid references auth.users (id) on delete set null,
  add column if not exists original_filename text not null default '',
  add column if not exists storage_key text,
  add column if not exists public_key text,
  add column if not exists preview_key text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists checksum text,
  add column if not exists upload_status text not null default 'complete',
  add column if not exists privacy text not null default 'private',
  add column if not exists multipart_upload_id text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.media drop constraint if exists media_upload_status_check;
alter table public.media add constraint media_upload_status_check
  check (upload_status in ('pending', 'uploading', 'complete', 'failed', 'aborted'));

alter table public.media drop constraint if exists media_privacy_check;
alter table public.media add constraint media_privacy_check
  check (privacy in ('private', 'public'));

create unique index if not exists media_storage_key_idx
  on public.media (storage_key)
  where storage_key is not null;

create index if not exists media_shop_status_idx
  on public.media (shop_id, upload_status, created_at);

drop trigger if exists media_set_updated_at on public.media;
create trigger media_set_updated_at before update on public.media
for each row execute function public.set_updated_at();

-- Rewriting variants must not cascade-delete S3-backed media rows.
alter table public.media drop constraint if exists media_variant_id_fkey;
alter table public.media
  add constraint media_variant_id_fkey
  foreign key (variant_id) references public.product_variants (id) on delete set null;

drop policy if exists media_select_public_or_owner on public.media;

-- Owners see their shop. The public may only see completed, public media
-- attached to a published, non-hidden product. Board/draft objects stay private.
create policy media_select_owner_or_published on public.media
  for select using (
    shop_id = public.current_shop_id()
    or (
      privacy = 'public'
      and upload_status = 'complete'
      and product_id is not null
      and exists (
        select 1 from public.products p
        where p.id = media.product_id
          and p.published = true
          and p.status <> 'hidden'
      )
    )
  );
