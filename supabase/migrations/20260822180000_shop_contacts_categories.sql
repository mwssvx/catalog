-- Public contact links + owner-managed category list.

alter table public.shops
  add column if not exists instagram text not null default '',
  add column if not exists telegram text not null default '',
  add column if not exists categories text[] not null default array[
    'tops',
    'bottoms',
    'outerwear',
    'dresses',
    'shoes',
    'accessories'
  ]::text[];
