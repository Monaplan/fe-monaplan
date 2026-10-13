-- Amplop & Kado: catatan amplop, transfer, dan kado yang diterima pasangan.

do $$ begin
  create type public.gift_receipt_kind as enum ('amplop', 'transfer', 'kado');
exception when duplicate_object then null; end $$;

create table if not exists public.gift_receipts (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.wedding_projects(id) on delete cascade,
  guest_id      uuid references public.guests(id) on delete set null,
  giver_name    text not null check (char_length(giver_name) between 1 and 120),
  side          public.party_side not null default 'bersama',
  kind          public.gift_receipt_kind not null default 'amplop',
  amount_idr    bigint check (amount_idr >= 0),
  item_name     text check (char_length(item_name) <= 200),
  received_on   date not null default current_date,
  recorded_by   uuid references public.profiles(id) on delete set null,
  recorded_via  text not null default 'app' check (recorded_via in ('app', 'panitia')),
  thanked_at    timestamptz,
  notes         text check (notes is null or char_length(notes) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (kind = 'kado' or amount_idr is not null),
  check (kind <> 'kado' or item_name is not null)
);

do $$
declare t text := 'gift_receipts';
begin
  execute format('alter table public.%I enable row level security', t);
  execute format('drop policy if exists %I on public.%I', t || '_select', t);
  execute format('drop policy if exists %I on public.%I', t || '_insert', t);
  execute format('drop policy if exists %I on public.%I', t || '_update', t);
  execute format('drop policy if exists %I on public.%I', t || '_delete', t);
  execute format('create policy %I on public.%I for select to authenticated using (public.can_read_project(project_id))', t || '_select', t);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.can_write_project(project_id))', t || '_insert', t);
  execute format('create policy %I on public.%I for update to authenticated using (public.can_write_project(project_id)) with check (public.can_write_project(project_id))', t || '_update', t);
  execute format('create policy %I on public.%I for delete to authenticated using (public.can_write_project(project_id))', t || '_delete', t);
  execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
  execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
end $$;

create index if not exists gift_receipts_project_idx on public.gift_receipts (project_id, received_on desc);
create index if not exists gift_receipts_guest_idx on public.gift_receipts (guest_id) where guest_id is not null;

-- Indeks pencarian, dilewati bila pg_trgm tidak tersedia (pola sama dengan migrasi 20261009000006)
do $$ begin
  create index if not exists gift_receipts_name_trgm on public.gift_receipts using gin (giver_name extensions.gin_trgm_ops);
exception when others then null; end $$;
