-- Expand ai_jobs into a resumable organization/action job queue.
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
