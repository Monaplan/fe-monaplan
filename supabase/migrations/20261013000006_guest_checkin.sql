-- Check-in tamu hari H dengan QR. Setiap tamu punya kode unik; checked_in_at sudah ada sejak skema awal.

-- Kode 10 karakter tanpa karakter yang mudah tertukar (0/O, 1/I/L)
create or replace function public.gen_checkin_code() returns text
language sql volatile as $$
  select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 10)
$$;

alter table public.guests
  add column if not exists checkin_code   text default public.gen_checkin_code(),
  add column if not exists checked_in_pax smallint,
  add column if not exists checked_in_by  text;

update public.guests set checkin_code = public.gen_checkin_code() where checkin_code is null;
alter table public.guests alter column checkin_code set not null;

create unique index if not exists guests_checkin_code_uk on public.guests (checkin_code);
create index if not exists guests_checked_in_idx on public.guests (project_id) where checked_in_at is not null;

do $$ begin
  alter table public.guests add constraint guests_checked_in_pax_range check (checked_in_pax is null or checked_in_pax between 0 and 50);
exception when duplicate_object then null; end $$;

-- Hanya dipanggil server: dari ruang kerja (setelah memastikan owner atau editor) dan dari tautan panitia (setelah token cocok).
-- for update menjamin dua petugas yang memindai bersamaan tidak membuat check-in ganda.
create or replace function public.checkin_guest(
  p_project_id uuid, p_code text, p_pax smallint, p_by text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.guests;
begin
  select * into v from public.guests
   where project_id = p_project_id and checkin_code = upper(trim(p_code))
   for update;
  if not found then raise exception 'CHECKIN_NOT_FOUND'; end if;

  if v.checked_in_at is not null then
    return jsonb_build_object('guest_id', v.id, 'name', v.name, 'already', true,
      'checked_in_at', v.checked_in_at, 'checked_in_pax', v.checked_in_pax);
  end if;

  update public.guests g
     set checked_in_at  = now(),
         checked_in_pax = least(greatest(coalesce(p_pax, nullif(v.pax_confirmed, 0), v.pax_invited), 0), 50),
         checked_in_by  = left(coalesce(nullif(trim(p_by), ''), 'Panitia'), 80)
   where g.id = v.id
  returning g.* into v;

  return jsonb_build_object('guest_id', v.id, 'name', v.name, 'already', false,
    'checked_in_at', v.checked_in_at, 'checked_in_pax', v.checked_in_pax);
end $$;

revoke all on function public.checkin_guest(uuid, text, smallint, text) from public, anon, authenticated;
grant execute on function public.checkin_guest(uuid, text, smallint, text) to service_role;
