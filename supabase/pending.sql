-- Paste this whole file in Supabase → SQL Editor → Run
-- Idempotent: safe to run more than once.

alter table public.shops
  add column if not exists logo_url text not null default '',
  add column if not exists cover_url text not null default '';

alter table public.board_documents
  add column if not exists version integer not null default 1;

create index if not exists board_documents_shop_version_idx
  on public.board_documents (shop_id, version);

alter table public.ai_jobs
  add column if not exists kind text not null default 'organize';

alter table public.ai_jobs
  add column if not exists progress jsonb not null default '{}'::jsonb;

alter table public.ai_jobs
  add column if not exists proposals jsonb not null default '[]'::jsonb;

alter table public.ai_jobs
  add column if not exists element_ids text[] not null default '{}';

alter table public.ai_jobs
  add column if not exists error text;

alter table public.ai_jobs
  add column if not exists summary text not null default '';

create index if not exists ai_jobs_shop_status_idx
  on public.ai_jobs (shop_id, status, created_at desc);
