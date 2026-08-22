-- Shop logo and cover URLs (S3/CloudFront or https). Metadata only.

alter table public.shops
  add column if not exists logo_url text not null default '',
  add column if not exists cover_url text not null default '';
