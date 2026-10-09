-- Slug proyek, tingkat paket (tier) dengan upgrade selisih, kuota 50 MB, bahasa pengguna, dan tiket bantuan.
-- Jalankan setelah migrasi 1-4.

alter type public.license_status add value if not exists 'superseded';

-- ---------- Slug proyek ----------
create or replace function public.slugify(t text) returns text
language sql immutable as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]+', '-', 'g')), ''), 'proyek')
$$;

alter table public.wedding_projects add column if not exists slug text;
alter table public.wedding_projects add column if not exists storage_prefix text;

-- Slug lama yang pernah dipakai, agar tautan lama dialihkan ke slug baru
create table if not exists public.project_slug_history (
  slug        text primary key,
  project_id  uuid not null references public.wedding_projects(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.project_slug_history enable row level security;

-- Slug unik: tidak dipakai proyek lain dan tidak ada di riwayat milik proyek lain
create or replace function public.unique_project_slug(p_base text, p_exclude uuid default null) returns text
language plpgsql set search_path = public as $$
declare
  v_base text := left(public.slugify(p_base), 40);
  v_slug text := v_base;
  n int := 1;
begin
  loop
    exit when not exists (select 1 from public.wedding_projects where slug = v_slug and id is distinct from p_exclude)
          and not exists (select 1 from public.project_slug_history where slug = v_slug and project_id is distinct from p_exclude);
    n := n + 1;
    v_slug := v_base || '-' || n;
  end loop;
  return v_slug;
end $$;

create or replace function public.project_slug_base(p public.wedding_projects) returns text
language sql immutable as $$
  select coalesce(nullif(trim(p.partner_one_nickname), ''), split_part(trim(p.partner_one_name), ' ', 1))
         || '-' ||
         coalesce(nullif(trim(p.partner_two_nickname), ''), split_part(trim(p.partner_two_name), ' ', 1))
$$;

-- Proyek yang sudah ada: slug dari nama pasangan, jalur berkas tetap memakai ID lama agar berkas lama tetap valid
do $$
declare r public.wedding_projects;
begin
  for r in select * from public.wedding_projects where slug is null order by created_at loop
    update public.wedding_projects
    set slug = public.unique_project_slug(public.project_slug_base(r), r.id),
        storage_prefix = coalesce(storage_prefix, r.id::text)
    where id = r.id;
  end loop;
end $$;

alter table public.wedding_projects alter column slug set not null;
alter table public.wedding_projects alter column storage_prefix set not null;
create unique index if not exists wedding_projects_slug_key on public.wedding_projects (slug);
create unique index if not exists wedding_projects_storage_prefix_key on public.wedding_projects (storage_prefix);

create or replace function public.wedding_projects_slug_insert() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.unique_project_slug(public.project_slug_base(new), null);
  else
    new.slug := public.unique_project_slug(new.slug, null);
  end if;
  -- Jalur berkas permanen dan terbaca: tidak berubah walau slug diganti
  new.storage_prefix := coalesce(new.storage_prefix, new.slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  return new;
end $$;

drop trigger if exists wedding_projects_slug_insert on public.wedding_projects;
create trigger wedding_projects_slug_insert before insert on public.wedding_projects
  for each row execute function public.wedding_projects_slug_insert();

create or replace function public.wedding_projects_slug_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.storage_prefix is distinct from old.storage_prefix then
    raise exception 'STORAGE_PREFIX_IMMUTABLE';
  end if;
  if new.slug is distinct from old.slug then
    if new.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(new.slug) not between 3 and 60 then
      raise exception 'SLUG_INVALID';
    end if;
    if exists (select 1 from public.wedding_projects where slug = new.slug and id <> new.id)
       or exists (select 1 from public.project_slug_history where slug = new.slug and project_id <> new.id) then
      raise exception 'SLUG_TAKEN';
    end if;
    insert into public.project_slug_history (slug, project_id) values (old.slug, old.id) on conflict (slug) do nothing;
    delete from public.project_slug_history where slug = new.slug and project_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists wedding_projects_slug_update on public.wedding_projects;
create trigger wedding_projects_slug_update before update on public.wedding_projects
  for each row execute function public.wedding_projects_slug_update();

-- ---------- Tingkat paket dan upgrade selisih ----------
alter table public.plans add column if not exists tier smallint not null default 1;
update public.plans set tier = 0 where code = 'TRIAL';

alter table public.orders add column if not exists upgrade_from_license_id uuid references public.licenses(id) on delete set null;
alter table public.orders add column if not exists credit_idr bigint not null default 0 check (credit_idr >= 0);

-- Kuota penyimpanan per pengguna: 50 MB
alter table public.plans alter column storage_quota_mb set default 50;
update public.plans set storage_quota_mb = 50 where storage_quota_mb > 50;

-- Tier tertinggi dari lisensi selamanya yang aktif (null bila tidak punya)
create or replace function public.lifetime_tier(p_user_id uuid) returns smallint
language sql stable security definer set search_path = public as $$
  select max(p.tier) from public.licenses l join public.plans p on p.id = l.plan_id
  where l.user_id = p_user_id and l.status = 'active' and l.ends_at is null
$$;

-- Boleh upgrade bila paket tujuan selamanya dan tier-nya lebih tinggi dari yang dimiliki
create or replace function public.can_upgrade_to(p_user_id uuid, p_plan_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.tier from public.plans p where p.id = p_plan_id and p.type = 'lifetime') > public.lifetime_tier(p_user_id), false)
$$;

create or replace function public.issue_license(
  p_user_id        uuid,
  p_plan_id        uuid,
  p_source         public.license_source,
  p_order_id       uuid default null,
  p_access_code_id uuid default null,
  p_granted_by     uuid default null
) returns public.licenses
language plpgsql security definer set search_path = public as $$
declare
  v_plan     public.plans;
  v_start    timestamptz;
  v_end      timestamptz;
  v_license  public.licenses;
begin
  perform 1 from public.profiles where id = p_user_id for update;

  select * into v_plan from public.plans where id = p_plan_id;
  if not found then
    raise exception 'PLAN_NOT_FOUND';
  end if;

  if public.has_lifetime_license(p_user_id) then
    -- Hanya naik ke tier lebih tinggi yang diizinkan; lisensi lama digantikan
    if not public.can_upgrade_to(p_user_id, p_plan_id) then
      raise exception 'ALREADY_LIFETIME';
    end if;
    update public.licenses
    set status = 'superseded', revoked_at = now(), revoked_reason = 'Upgrade ke ' || v_plan.name
    where user_id = p_user_id and status = 'active' and ends_at is null;
  end if;

  if v_plan.type = 'lifetime' then
    v_start := now();
    v_end   := null;
  else
    v_start := public.next_license_start(p_user_id);
    v_end   := v_start + make_interval(days => v_plan.duration_days);
  end if;

  insert into public.licenses
    (user_id, plan_id, source, order_id, access_code_id, granted_by, starts_at, ends_at)
  values
    (p_user_id, v_plan.id, p_source, p_order_id, p_access_code_id, p_granted_by, v_start, v_end)
  returning * into v_license;

  return v_license;
end $$;

revoke execute on function public.issue_license(uuid, uuid, public.license_source, uuid, uuid, uuid)
  from public, anon, authenticated;

create or replace function public.grant_license_for_order(p_order_id uuid)
returns public.licenses
language plpgsql security definer set search_path = public as $$
declare
  v_order    public.orders;
  v_license  public.licenses;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  select * into v_license from public.licenses where order_id = p_order_id;
  if found then
    return v_license;
  end if;

  perform 1 from public.profiles where id = v_order.user_id for update;

  -- Sudah punya akses selamanya di tier yang sama atau lebih tinggi (mis. dua order lunas bersamaan):
  -- order dicatat lunas dan ditandai untuk ditinjau admin (refund)
  if public.has_lifetime_license(v_order.user_id) and not public.can_upgrade_to(v_order.user_id, v_order.plan_id) then
    update public.orders
    set status = 'paid', paid_at = coalesce(paid_at, now()), needs_review = true
    where id = p_order_id;
    select * into v_license from public.licenses
    where user_id = v_order.user_id and status = 'active' and ends_at is null
    limit 1;
    return v_license;
  end if;

  v_license := public.issue_license(v_order.user_id, v_order.plan_id, 'payment', v_order.id);

  update public.orders
  set status = 'paid', paid_at = coalesce(paid_at, now())
  where id = p_order_id;

  return v_license;
end $$;

revoke execute on function public.grant_license_for_order(uuid) from public, anon, authenticated;

-- ---------- Bahasa pengguna ----------
alter table public.profiles add column if not exists language text not null default 'id' check (language in ('id', 'en'));
grant update (language) on public.profiles to authenticated;

-- ---------- Tiket bantuan ----------
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid references public.wedding_projects(id) on delete set null,
  subject     text not null check (length(subject) between 3 and 120),
  message     text not null check (length(message) between 5 and 4000),
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);
alter table public.support_tickets enable row level security;
drop policy if exists support_tickets_select_own on public.support_tickets;
create policy support_tickets_select_own on public.support_tickets
  for select to authenticated using (user_id = auth.uid());
drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own on public.support_tickets
  for insert to authenticated with check (user_id = auth.uid() and status = 'open');
