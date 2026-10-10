-- Kode promo, popup promo, template RSVP, notifikasi RSVP, indeks pencarian.

-- ---------- Promo: kode dan popup ----------
alter table public.promos add column if not exists code text;
alter table public.promos add column if not exists popup_enabled boolean not null default false;
alter table public.promos add column if not exists popup_title text;
alter table public.promos add column if not exists popup_text text;
alter table public.promos add column if not exists popup_cta text;
alter table public.promos add column if not exists popup_audience text not null default 'all';

do $$ begin
  alter table public.promos add constraint promos_code_format
    check (code is null or code ~ '^[A-Za-z0-9_-]{3,32}$');
  alter table public.promos add constraint promos_popup_audience_valid
    check (popup_audience in ('all', 'guest', 'no_license', 'trial'));
exception when duplicate_object then null; end $$;

create unique index if not exists promos_code_unique on public.promos (lower(code)) where code is not null;

-- ---------- Template RSVP ----------
alter table public.wedding_projects add column if not exists rsvp_template text not null default 'adat_luxury';
do $$ begin
  alter table public.wedding_projects add constraint wedding_projects_rsvp_template_valid
    check (rsvp_template in ('adat_luxury', 'klasik_emas', 'minimal_modern', 'floral_romantis', 'rustic_natural'));
exception when duplicate_object then null; end $$;

-- ---------- Notifikasi saat tamu mengonfirmasi ----------
create or replace function public.submit_rsvp(
  p_token text, p_status public.rsvp_status, p_pax smallint, p_message text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_guest    public.guests;
  v_project  public.wedding_projects;
  v_body     text;
begin
  select * into v_guest from public.guests where rsvp_token = p_token for update;
  if not found then
    raise exception 'RSVP_NOT_FOUND';
  end if;

  select * into v_project from public.wedding_projects where id = v_guest.project_id;
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
  if p_status = 'hadir' and (p_pax < 1 or p_pax > v_guest.pax_invited) then
    raise exception 'RSVP_PAX_INVALID';
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

  -- Pemilik dan editor menerima notifikasi di aplikasi; dedupe_key mencegah baris ganda pada detik yang sama
  insert into public.notifications (user_id, project_id, type, title, body, link_path, channel, dedupe_key)
  select m.user_id, v_project.id, 'rsvp_response', 'Konfirmasi baru', v_body,
         '/app/' || coalesce(v_project.slug, v_project.id::text) || '/tamu', 'in_app',
         'rsvp:' || v_guest.id || ':' || floor(extract(epoch from now()))::bigint || ':' || m.user_id
  from public.project_members m
  where m.project_id = v_project.id and m.role in ('owner', 'editor')
  on conflict (dedupe_key) do nothing;
end $$;

revoke execute on function public.submit_rsvp(text, public.rsvp_status, smallint, text)
  from public, anon, authenticated;

-- Notifikasi diteruskan ke peramban lewat Realtime; RLS (notifications_select_own) membatasi penerimanya
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception when others then null; end $$;

-- ---------- Indeks pencarian (opsional, dilewati bila pg_trgm tidak tersedia) ----------
do $$ begin
  create extension if not exists pg_trgm with schema extensions;
  create index if not exists tasks_title_trgm on public.tasks using gin (title extensions.gin_trgm_ops);
  create index if not exists vendors_name_trgm on public.vendors using gin (name extensions.gin_trgm_ops);
  create index if not exists guests_name_trgm on public.guests using gin (name extensions.gin_trgm_ops);
  create index if not exists budget_items_name_trgm on public.budget_items using gin (name extensions.gin_trgm_ops);
  create index if not exists gift_items_name_trgm on public.gift_items using gin (name extensions.gin_trgm_ops);
  create index if not exists documents_title_trgm on public.documents using gin (title extensions.gin_trgm_ops);
  create index if not exists rundown_items_title_trgm on public.rundown_items using gin (title extensions.gin_trgm_ops);
exception when others then null; end $$;
