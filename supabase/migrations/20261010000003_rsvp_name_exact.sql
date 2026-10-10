-- Pencocokan nama RSVP dua tahap: nama persis dulu (huruf besar-kecil dan tanda baca diabaikan, sapaan tetap dihitung),
-- baru nama tanpa sapaan. Tanpa ini "Bapak Budi" dan "Ibu Budi" di daftar tamu dianggap kembar karena sapaannya dibuang.
-- Jalankan setelah 20261010000002.

create or replace function public.normalize_guest_name_exact(t text) returns text
language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(lower(coalesce(t, '')), '[^[:alnum:] ]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;

-- ID tamu yang cocok: kecocokan persis bila ada, selain itu kecocokan tanpa sapaan
create or replace function public.rsvp_match(p_project uuid, p_name text) returns uuid[]
language plpgsql stable set search_path = public as $$
declare
  v_exact uuid[];
  v_loose uuid[];
begin
  select coalesce(array_agg(id), '{}') into v_exact from public.guests
  where project_id = p_project and public.normalize_guest_name_exact(name) = public.normalize_guest_name_exact(p_name);
  if coalesce(array_length(v_exact, 1), 0) > 0 then
    return v_exact;
  end if;
  select coalesce(array_agg(id), '{}') into v_loose from public.guests
  where project_id = p_project and public.normalize_guest_name(name) = public.normalize_guest_name(p_name);
  return v_loose;
end $$;

-- Satu tamu yang cocok dengan nama di tautan, atau jumlah kecocokan bila bukan tepat satu.
-- Ucapan tamu sengaja tidak dikembalikan: nama mudah ditebak, jadi ucapan orang lain tidak boleh terbaca lewat tautan.
create or replace function public.rsvp_lookup(p_slug text, p_name text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_project_id uuid;
  v_ids uuid[];
  v_guest public.guests;
begin
  select id into v_project_id from public.wedding_projects where slug = p_slug;
  if v_project_id is null then
    select project_id into v_project_id from public.project_slug_history where slug = p_slug;
  end if;
  if v_project_id is null or public.normalize_guest_name_exact(p_name) = '' then
    return jsonb_build_object('matches', 0);
  end if;
  v_ids := public.rsvp_match(v_project_id, p_name);
  if coalesce(array_length(v_ids, 1), 0) = 1 then
    select * into v_guest from public.guests where id = v_ids[1];
    return jsonb_build_object('matches', 1, 'guest', jsonb_build_object(
      'id', v_guest.id, 'name', v_guest.name, 'pax_invited', v_guest.pax_invited, 'rsvp_status', v_guest.rsvp_status,
      'pax_confirmed', v_guest.pax_confirmed));
  end if;
  return jsonb_build_object('matches', coalesce(array_length(v_ids, 1), 0));
end $$;

create or replace function public.submit_rsvp_by_name(
  p_slug text, p_name text, p_status public.rsvp_status, p_pax smallint, p_message text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_project  public.wedding_projects;
  v_guest    public.guests;
  v_ids      uuid[];
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
  if public.normalize_guest_name_exact(p_name) = '' or char_length(btrim(p_name)) > 80 then
    raise exception 'RSVP_NAME_INVALID';
  end if;

  v_ids := public.rsvp_match(v_project.id, p_name);
  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count > 1 then
    raise exception 'RSVP_NAME_AMBIGUOUS';
  elsif v_count = 1 then
    select * into v_guest from public.guests where id = v_ids[1] for update;
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

revoke execute on function public.rsvp_match(uuid, text) from public, anon, authenticated;
revoke execute on function public.rsvp_lookup(text, text) from public, anon, authenticated;
revoke execute on function public.submit_rsvp_by_name(text, text, public.rsvp_status, smallint, text) from public, anon, authenticated;
