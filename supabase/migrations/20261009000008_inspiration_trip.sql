-- Dua modul bonus: Papan Inspirasi dan Perjalanan Berdua.

create table if not exists public.inspiration_items (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.wedding_projects(id) on delete cascade,
  category     text not null default 'lainnya'
               check (category in ('dekorasi', 'busana', 'bunga', 'venue', 'makeup', 'katering', 'lainnya')),
  title        text not null check (char_length(title) between 1 and 120),
  note         text check (note is null or char_length(note) <= 500),
  link_url     text check (link_url is null or char_length(link_url) <= 500),
  color        text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  image_path   text,
  is_favorite  boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Satu rencana perjalanan per pernikahan
create table if not exists public.trip_plans (
  project_id   uuid primary key references public.wedding_projects(id) on delete cascade,
  destination  text check (destination is null or char_length(destination) <= 120),
  start_date   date,
  end_date     date,
  budget_idr   bigint not null default 0 check (budget_idr >= 0),
  notes        text check (notes is null or char_length(notes) <= 1000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.trip_items (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.wedding_projects(id) on delete cascade,
  day_date     date,
  start_time   time,
  kind         text not null default 'kegiatan'
               check (kind in ('akomodasi', 'transport', 'kegiatan', 'makan', 'lainnya')),
  title        text not null check (char_length(title) between 1 and 120),
  location     text check (location is null or char_length(location) <= 160),
  cost_idr     bigint not null default 0 check (cost_idr >= 0),
  is_booked    boolean not null default false,
  notes        text check (notes is null or char_length(notes) <= 500),
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['inspiration_items', 'trip_plans', 'trip_items'] loop
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
  end loop;
end $$;

create index if not exists inspiration_items_project_idx on public.inspiration_items (project_id, category, sort_order);
create index if not exists trip_items_project_idx on public.trip_items (project_id, day_date, start_time, sort_order);
