-- Riwayat setoran tabungan nikah. wedding_projects.savings_idr (migrasi 20261013000003) menjadi total turunan yang dijaga trigger,
-- jadi Dashboard, pengingat, dan perhitungan target tidak berubah cara membacanya.

create table if not exists public.savings_deposits (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.wedding_projects(id) on delete cascade,
  amount_idr    bigint not null check (amount_idr > 0),
  deposited_on  date not null default current_date,
  note          text check (note is null or char_length(note) <= 300),
  recorded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

do $$
declare t text := 'savings_deposits';
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

create index if not exists savings_deposits_project_idx on public.savings_deposits (project_id, deposited_on desc);

-- Saldo awal: dana yang sebelumnya diisi manual dipindahkan menjadi satu setoran (hanya untuk proyek yang belum punya setoran)
insert into public.savings_deposits (project_id, amount_idr, deposited_on, note, created_at, updated_at)
select w.id, w.savings_idr, coalesce(w.savings_updated_at::date, current_date), 'Saldo awal',
       coalesce(w.savings_updated_at, now()), coalesce(w.savings_updated_at, now())
from public.wedding_projects w
where w.savings_idr > 0
  and not exists (select 1 from public.savings_deposits d where d.project_id = w.id);

-- Total turunan: selalu = jumlah setoran. security definer agar editor (yang tidak otomatis boleh mengubah proyek) tetap memperbarui total.
create or replace function public.sync_project_savings() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.project_id, old.project_id);
begin
  update public.wedding_projects w set
    savings_idr = coalesce((select sum(amount_idr) from public.savings_deposits where project_id = pid), 0),
    savings_updated_at = (select max(updated_at) from public.savings_deposits where project_id = pid)
  where w.id = pid;
  return null;
end $$;

drop trigger if exists savings_deposits_sync on public.savings_deposits;
create trigger savings_deposits_sync
  after insert or update or delete on public.savings_deposits
  for each row execute function public.sync_project_savings();
