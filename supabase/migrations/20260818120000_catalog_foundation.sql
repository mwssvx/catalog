-- Catalog foundation: one shop, one owner, shop_id everywhere for later multi-shop.
-- Media files stay outside Supabase Storage (URLs only; AWS later).

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null default 'Dordoi',
  tagline text not null default '',
  location text not null default '',
  whatsapp text not null default '',
  currency text not null default 'KGS',
  currency_symbol text not null default 'сом',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete restrict,
  role text not null default 'owner' check (role = 'owner'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_shop_id_idx on public.profiles (shop_id);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  code text not null,
  title text not null,
  notes text not null default '',
  description text not null default '',
  retail_price numeric,
  wholesale_price numeric,
  min_wholesale_qty integer,
  sizes text[] not null default '{}',
  quantity integer,
  material text,
  origin text,
  category text,
  subcategory text,
  condition text,
  status text not null default 'in_stock',
  tags text[] not null default '{}',
  collections text[] not null default '{}',
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, code)
);

create index if not exists products_shop_id_idx on public.products (shop_id);
create index if not exists products_published_idx on public.products (shop_id, published);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx on public.product_variants (product_id);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists media_product_id_idx on public.media (product_id);

create table if not exists public.board_documents (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique references public.shops (id) on delete cascade,
  camera jsonb not null default '{"x":0,"y":0,"zoom":1}'::jsonb,
  elements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_versions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  board_document_id uuid references public.board_documents (id) on delete set null,
  label text not null default '',
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists board_versions_shop_id_idx on public.board_versions (shop_id, created_at desc);

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  status text not null default 'queued',
  prompt text not null default '',
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  kind text not null,
  text text not null,
  product_ids uuid[] not null default '{}',
  element_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.action_history (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists action_history_shop_id_idx on public.action_history (shop_id, created_at desc);

create trigger shops_set_updated_at before update on public.shops
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
for each row execute function public.set_updated_at();
create trigger board_documents_set_updated_at before update on public.board_documents
for each row execute function public.set_updated_at();
create trigger ai_jobs_set_updated_at before update on public.ai_jobs
for each row execute function public.set_updated_at();

create or replace function public.current_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop_id from public.profiles where id = auth.uid() limit 1
$$;

revoke all on function public.current_shop_id() from public;
grant execute on function public.current_shop_id() to anon, authenticated;

alter table public.shops enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.media enable row level security;
alter table public.board_documents enable row level security;
alter table public.board_versions enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.ai_suggestions enable row level security;
alter table public.action_history enable row level security;

-- Shops: public catalog fields only (this table has no owner secrets).
create policy shops_select_public on public.shops
  for select using (true);

create policy shops_update_owner on public.shops
  for update
  using (id = public.current_shop_id())
  with check (id = public.current_shop_id());

create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid() and shop_id = public.current_shop_id());

-- Products: anonymous sees published, non-hidden only. Owners see their shop.
create policy products_select_public_or_owner on public.products
  for select using (
    shop_id = public.current_shop_id()
    or (published = true and status <> 'hidden')
  );

create policy products_insert_owner on public.products
  for insert with check (shop_id = public.current_shop_id());

create policy products_update_owner on public.products
  for update
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy products_delete_owner on public.products
  for delete using (shop_id = public.current_shop_id());

create policy variants_select_public_or_owner on public.product_variants
  for select using (
    shop_id = public.current_shop_id()
    or exists (
      select 1 from public.products p
      where p.id = product_id
        and p.published = true
        and p.status <> 'hidden'
    )
  );

create policy variants_insert_owner on public.product_variants
  for insert with check (shop_id = public.current_shop_id());

create policy variants_update_owner on public.product_variants
  for update
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy variants_delete_owner on public.product_variants
  for delete using (shop_id = public.current_shop_id());

create policy media_select_public_or_owner on public.media
  for select using (
    shop_id = public.current_shop_id()
    or (
      product_id is not null
      and exists (
        select 1 from public.products p
        where p.id = media.product_id
          and p.published = true
          and p.status <> 'hidden'
      )
    )
  );

create policy media_insert_owner on public.media
  for insert with check (shop_id = public.current_shop_id());

create policy media_update_owner on public.media
  for update
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy media_delete_owner on public.media
  for delete using (shop_id = public.current_shop_id());

create policy board_documents_owner_all on public.board_documents
  for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy board_versions_owner_all on public.board_versions
  for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy ai_jobs_owner_all on public.ai_jobs
  for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy ai_suggestions_owner_all on public.ai_suggestions
  for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy action_history_owner_all on public.action_history
  for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.board_documents;
alter publication supabase_realtime add table public.ai_suggestions;

insert into public.shops (
  id, slug, name, tagline, location, whatsapp, currency, currency_symbol
) values (
  'c0a1d0ce-0000-4000-8000-000000000001',
  'dordoi',
  'Dordoi',
  '',
  'Дордой базар, Бишкек',
  '',
  'KGS',
  'сом'
) on conflict (id) do nothing;
