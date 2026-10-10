-- Undangan lewat tautan domain/slug-pengantin?to=Nama Tamu: RSVP dicocokkan lewat nama.
-- Termasuk lima tema undangan baru, slug yang tidak boleh dipakai, dan pembuangan objek yang tidak lagi dipakai.
-- Jalankan setelah migrasi 1-8 dan 20261010000001.

-- ---------- Tema undangan ----------
alter table public.wedding_projects drop constraint if exists wedding_projects_rsvp_template_valid;
update public.wedding_projects set rsvp_template = case rsvp_template
  when 'adat_luxury' then 'noir_luxury'
  when 'minimal_modern' then 'elegan_minimalis'
  when 'floral_romantis' then 'botanical_soft'
  when 'rustic_natural' then 'botanical_soft'
  else rsvp_template end
where rsvp_template in ('adat_luxury', 'minimal_modern', 'floral_romantis', 'rustic_natural');
alter table public.wedding_projects alter column rsvp_template set default 'elegan_minimalis';
alter table public.wedding_projects add constraint wedding_projects_rsvp_template_valid
  check (rsvp_template in ('elegan_minimalis', 'klasik_emas', 'bali', 'noir_luxury', 'botanical_soft'));

-- ---------- Slug yang dicadangkan untuk rute aplikasi ----------
create or replace function public.reserved_slug(p text) returns boolean
language sql immutable as $$
  select p = any (array[
    'app', 'admin', 'akun', 'aktivasi', 'api', 'auth', 'checkout', 'gabung', 'login', 'mulai', 'onboarding',
    'privasi', 'rsvp', 'reset-password', 'lupa-password', 'icon', 'apple-icon', 'manifest', 'robots', 'sitemap',
    'opengraph-image', 'favicon', 'proyek'
  ])
$$;

create or replace function public.unique_project_slug(p_base text, p_exclude uuid default null) returns text
language plpgsql set search_path = public as $$
declare
  v_base text := left(public.slugify(p_base), 40);
  v_slug text := v_base;
  n int := 1;
begin
  loop
    exit when not public.reserved_slug(v_slug)
          and not exists (select 1 from public.wedding_projects where slug = v_slug and id is distinct from p_exclude)
          and not exists (select 1 from public.project_slug_history where slug = v_slug and project_id is distinct from p_exclude);
    n := n + 1;
    v_slug := v_base || '-' || n;
  end loop;
  return v_slug;
end $$;

-- Pengubah alamat proyek menolak kata yang dicadangkan
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
    if public.reserved_slug(new.slug)
       or exists (select 1 from public.wedding_projects where slug = new.slug and id <> new.id)
       or exists (select 1 from public.project_slug_history where slug = new.slug and project_id <> new.id) then
      raise exception 'SLUG_TAKEN';
    end if;
    insert into public.project_slug_history (slug, project_id) values (old.slug, old.id) on conflict (slug) do nothing;
    delete from public.project_slug_history where slug = new.slug and project_id = new.id;
  end if;
  return new;
end $$;

-- Proyek yang slug-nya bentrok dengan nama rute diganti
do $$
declare r public.wedding_projects;
begin
  for r in select * from public.wedding_projects where public.reserved_slug(slug) loop
    update public.wedding_projects set slug = public.unique_project_slug(r.slug || '-nikah', r.id) where id = r.id;
  end loop;
end $$;

-- ---------- Tamu yang mendaftar sendiri lewat tautan umum ----------
alter table public.guests add column if not exists self_registered boolean not null default false;

-- Nama dibandingkan tanpa huruf besar, tanda baca, spasi ganda, dan sapaan di depan
create or replace function public.normalize_guest_name(t text) returns text
language sql immutable as $$
  select btrim(regexp_replace(
    regexp_replace(
      regexp_replace(lower(coalesce(t, '')), '[^[:alnum:] ]+', ' ', 'g'),
      '^\s*((bapak|ibu|bpk|pak|bu|mas|mbak|kak|mr|mrs|ms|dr|drs|ir|prof|hj|sdr|sdri)\s+)+', ''),
    '\s+', ' ', 'g'))
$$;

-- Satu tamu yang cocok dengan nama di tautan (untuk mengisi form), atau jumlah kecocokan bila lebih dari satu
create or replace function public.rsvp_lookup(p_slug text, p_name text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_project_id uuid;
  v_norm text := public.normalize_guest_name(p_name);
  v_count int;
  v_guest public.guests;
begin
  select id into v_project_id from public.wedding_projects where slug = p_slug;
  if v_project_id is null then
    select project_id into v_project_id from public.project_slug_history where slug = p_slug;
  end if;
  if v_project_id is null or v_norm = '' then
    return jsonb_build_object('matches', 0);
  end if;
  select count(*) into v_count from public.guests where project_id = v_project_id and public.normalize_guest_name(name) = v_norm;
  if v_count = 1 then
    select * into v_guest from public.guests where project_id = v_project_id and public.normalize_guest_name(name) = v_norm;
    return jsonb_build_object('matches', 1, 'guest', jsonb_build_object(
      'id', v_guest.id, 'name', v_guest.name, 'pax_invited', v_guest.pax_invited, 'rsvp_status', v_guest.rsvp_status,
      'pax_confirmed', v_guest.pax_confirmed, 'rsvp_message', v_guest.rsvp_message));
  end if;
  return jsonb_build_object('matches', v_count);
end $$;

create or replace function public.submit_rsvp_by_name(
  p_slug text, p_name text, p_status public.rsvp_status, p_pax smallint, p_message text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_project  public.wedding_projects;
  v_guest    public.guests;
  v_norm     text := public.normalize_guest_name(p_name);
  v_count    int;
  v_body     text;
begin
  select * into v_project from public.wedding_projects where slug = p_slug;
  if not found then
    select p.* into v_project from public.wedding_projects p
    join public.project_slug_history h on h.project_id = p.id where h.slug = p_slug;
  end if;
  if not found then
    raise exception 'RSVP_NOT_FOUND';
  end if;
  if v_project.archived_at is not null then
    raise exception 'RSVP_CLOSED';
  end if;
  if v_project.rsvp_deadline is not null
     and (now() at time zone v_project.timezone)::date > v_project.rsvp_deadline then
    raise exception 'RSVP_DEADLINE_PASSED';
  end if;
  -- RSVP tetap dibuka 30 hari setelah masa aktif owner habis, ditutup bila lisensi dicabut
  if not exists (
    select 1 from public.licenses
    where user_id = v_project.owner_id and status = 'active'
      and (ends_at is null or ends_at + interval '30 days' > now())
  ) then
    raise exception 'RSVP_CLOSED';
  end if;
  if p_status = 'belum_respon' then
    raise exception 'RSVP_INVALID_STATUS';
  end if;
  if v_norm = '' or char_length(btrim(p_name)) > 80 then
    raise exception 'RSVP_NAME_INVALID';
  end if;

  select count(*) into v_count from public.guests where project_id = v_project.id and public.normalize_guest_name(name) = v_norm;
  if v_count > 1 then
    raise exception 'RSVP_NAME_AMBIGUOUS';
  elsif v_count = 1 then
    select * into v_guest from public.guests where project_id = v_project.id and public.normalize_guest_name(name) = v_norm for update;
    if p_status = 'hadir' and (p_pax < 1 or p_pax > v_guest.pax_invited) then
      raise exception 'RSVP_PAX_INVALID';
    end if;
  else
    -- Nama belum ada di daftar: dicatat sebagai tamu baru, dengan batas harian agar tidak membanjiri daftar
    if (select count(*) from public.guests where project_id = v_project.id and self_registered and created_at > now() - interval '1 day') >= 50 then
      raise exception 'RSVP_TOO_MANY';
    end if;
    if p_status = 'hadir' and (p_pax < 1 or p_pax > 5) then
      raise exception 'RSVP_PAX_INVALID';
    end if;
    insert into public.guests (project_id, name, pax_invited, self_registered)
    values (v_project.id, btrim(p_name), greatest(1, least(5, case when p_status = 'hadir' then p_pax else 1 end)), true)
    returning * into v_guest;
  end if;

  update public.guests
  set rsvp_status       = p_status,
      pax_confirmed     = case when p_status = 'hadir' then p_pax else 0 end,
      rsvp_message      = left(nullif(trim(p_message), ''), 500),
      rsvp_responded_at = now()
  where id = v_guest.id;

  v_body := v_guest.name || ': ' || case p_status
    when 'hadir' then 'Hadir (' || p_pax || ' orang)'
    when 'tidak_hadir' then 'Tidak hadir'
    else 'Masih ragu'
  end;

  insert into public.notifications (user_id, project_id, type, title, body, link_path, channel, dedupe_key)
  select m.user_id, v_project.id, 'rsvp_response', 'Konfirmasi baru', v_body,
         '/app/' || coalesce(v_project.slug, v_project.id::text) || '/tamu', 'in_app',
         'rsvp:' || v_guest.id || ':' || floor(extract(epoch from now()))::bigint || ':' || m.user_id
  from public.project_members m
  where m.project_id = v_project.id and m.role in ('owner', 'editor')
  on conflict (dedupe_key) do nothing;
end $$;

revoke execute on function public.rsvp_lookup(text, text) from public, anon, authenticated;
revoke execute on function public.submit_rsvp_by_name(text, text, public.rsvp_status, smallint, text) from public, anon, authenticated;

-- ---------- Buang yang tidak lagi dipakai ----------
drop function if exists public.submit_rsvp(text, public.rsvp_status, smallint, text);
alter table public.guests drop column if exists rsvp_token;
drop table if exists public.support_tickets;
