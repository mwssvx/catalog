-- Optimistic concurrency for Open Board documents.

alter table public.board_documents
  add column if not exists version integer not null default 1;

create index if not exists board_documents_shop_version_idx
  on public.board_documents (shop_id, version);
