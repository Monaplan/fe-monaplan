-- Trial, promo, pengaturan fitur, dan sinkronisasi Google Calendar.
-- Jalankan setelah migrasi 1-3. Aman dijalankan ulang.

-- ---------- Sumber lisensi baru: trial ----------
alter type public.license_source add value if not exists 'trial';

-- ---------- Pengaturan fitur yang bisa dihidup-matikan admin ----------
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null default '{}',
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);
alter table public.app_settings enable row level security;
-- Isinya bukan rahasia (dipakai landing page); hanya server dengan secret key yang boleh menulis
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select to anon, authenticated using (true);

insert into public.app_settings (key, value) values
  ('trial', '{"enabled": true, "days": 3}'),
  ('promo', '{"enabled": true}')
on conflict (key) do nothing;

-- ---------- Paket trial (tidak dijual, hanya dipakai untuk lisensi trial) ----------
insert into public.plans (code, name, description, type, duration_days, price_idr, max_projects, max_collaborators, is_public, is_active, sort_order)
values ('TRIAL', 'Trial', 'Coba semua fitur tanpa bayar', 'timed', 3, 0, 1, 3, false, true, 0)
on conflict (code) do nothing;

-- Akses kini selamanya: paket bermasa aktif lama disembunyikan dari penjualan
-- (lisensi yang sudah terbit tetap berlaku)
update public.plans set is_public = false, is_active = false where code = 'TIMED_12M';

-- ---------- Promo ----------
create table if not exists public.promos (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  plan_id         uuid references public.plans(id) on delete cascade,   -- null = berlaku untuk semua paket
  discount_type   text not null check (discount_type in ('percent', 'fixed')),
  discount_value  bigint not null check (discount_value > 0),
  starts_at       timestamptz,
  ends_at         timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (starts_at is null or ends_at is null or ends_at > starts_at)
);
alter table public.promos enable row level security;
drop policy if exists promos_select on public.promos;
create policy promos_select on public.promos
  for select to anon, authenticated using (is_active);

drop trigger if exists promos_set_updated_at on public.promos;
create trigger promos_set_updated_at before update on public.promos
  for each row execute function public.set_updated_at();

-- Jejak promo di order: amount_idr tetap nominal akhir yang dibayar (dicocokkan dengan webhook)
alter table public.orders add column if not exists original_amount_idr bigint;
alter table public.orders add column if not exists discount_idr bigint not null default 0 check (discount_idr >= 0);
alter table public.orders add column if not exists promo_id uuid references public.promos(id) on delete set null;
alter table public.orders add column if not exists promo_name text;

-- ---------- Mulai trial ----------
create or replace function public.start_trial()
returns public.licenses
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_cfg     jsonb;
  v_days    int;
  v_plan    public.plans;
  v_license public.licenses;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  perform 1 from public.profiles where id = v_uid for update;

  select value into v_cfg from public.app_settings where key = 'trial';
  if coalesce((v_cfg->>'enabled')::boolean, false) is not true then
    raise exception 'TRIAL_DISABLED';
  end if;
  v_days := greatest(1, coalesce((v_cfg->>'days')::int, 3));

  if exists (select 1 from public.licenses where user_id = v_uid and source::text = 'trial') then
    raise exception 'TRIAL_ALREADY_USED';
  end if;
  -- Trial hanya untuk akun yang belum pernah punya lisensi apa pun
  if exists (select 1 from public.licenses where user_id = v_uid) then
    raise exception 'ALREADY_HAS_LICENSE';
  end if;

  select * into v_plan from public.plans where code = 'TRIAL';
  if not found then
    raise exception 'PLAN_NOT_FOUND';
  end if;

  insert into public.licenses (user_id, plan_id, source, starts_at, ends_at)
  values (v_uid, v_plan.id, 'trial'::public.license_source, now(), now() + make_interval(days => v_days))
  returning * into v_license;

  return v_license;
end $$;

revoke execute on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;

-- ---------- Status akses proyek: tambahkan penanda trial ----------
create or replace function public.project_access_state(p_project_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_owner   uuid;
  v_active  public.licenses;
  v_last    public.licenses;
  v_revoked boolean;
begin
  if not public.can_read_project(p_project_id) then
    raise exception 'FORBIDDEN';
  end if;

  select owner_id into v_owner from public.wedding_projects where id = p_project_id;

  select * into v_active from public.licenses
  where user_id = v_owner and status = 'active'
    and starts_at <= now() and (ends_at is null or ends_at > now())
  order by ends_at desc nulls first
  limit 1;

  if found then
    select * into v_last from public.licenses
    where user_id = v_owner and status = 'active'
    order by ends_at desc nulls first
    limit 1;
    return jsonb_build_object(
      'state', case when v_last.ends_at is null then 'lifetime' else 'timed' end,
      'starts_at', v_active.starts_at,
      'ends_at', v_last.ends_at,
      'is_trial', v_last.ends_at is not null and v_last.source::text = 'trial'
    );
  end if;

  select exists (select 1 from public.licenses where user_id = v_owner and status = 'revoked')
     and not exists (select 1 from public.licenses where user_id = v_owner and status = 'active')
    into v_revoked;

  select * into v_last from public.licenses
  where user_id = v_owner and status = 'active'
  order by ends_at desc nulls first
  limit 1;

  return jsonb_build_object(
    'state', case when v_revoked then 'revoked'
                  when v_last.id is not null then 'expired'
                  else 'none' end,
    'ends_at', v_last.ends_at,
    'is_trial', v_last.id is not null and v_last.source::text = 'trial'
  );
end $$;

revoke execute on function public.project_access_state(uuid) from public, anon;
grant execute on function public.project_access_state(uuid) to authenticated;

-- ---------- Google Calendar ----------
-- Tanpa policy: token hanya dibaca server dengan secret key
create table if not exists public.google_calendar_links (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  google_email       text,
  refresh_token_enc  text not null,
  connected_at       timestamptz not null default now()
);
alter table public.google_calendar_links enable row level security;

create table if not exists public.google_calendar_syncs (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  project_id      uuid not null references public.wedding_projects(id) on delete cascade,
  calendar_id     text,                                  -- kalender sekunder "Monaplan" di akun Google
  auto_sync       boolean not null default true,
  last_synced_at  timestamptz,
  last_status     text,                                  -- ok | error
  last_message    text,
  created_at      timestamptz not null default now(),
  primary key (user_id, project_id)
);
alter table public.google_calendar_syncs enable row level security;

create table if not exists public.google_event_links (
  user_id          uuid not null,
  project_id       uuid not null,
  source           text not null,                        -- task | expense_payment | event | agenda
  source_id        uuid not null,
  google_event_id  text not null,
  fingerprint      text not null,
  primary key (user_id, project_id, source, source_id),
  foreign key (user_id, project_id) references public.google_calendar_syncs(user_id, project_id) on delete cascade
);
alter table public.google_event_links enable row level security;
