-- Fungsi bantu yang dipakai aplikasi di luar yang tertulis di ERD.md

-- Status akses sebuah proyek berdasarkan lisensi owner.
-- Kolaborator tidak bisa membaca tabel licenses milik owner (RLS), jadi status
-- diringkas lewat fungsi ini dan hanya untuk anggota proyek.
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

  -- Lisensi aktif dengan tanggal berakhir paling jauh (null = selamanya didahulukan)
  select * into v_active from public.licenses
  where user_id = v_owner and status = 'active'
    and starts_at <= now() and (ends_at is null or ends_at > now())
  order by ends_at desc nulls first
  limit 1;

  if found then
    -- Ujung masa aktif termasuk perpanjangan yang sudah antre
    select * into v_last from public.licenses
    where user_id = v_owner and status = 'active'
    order by ends_at desc nulls first
    limit 1;
    return jsonb_build_object(
      'state', case when v_last.ends_at is null then 'lifetime' else 'timed' end,
      'starts_at', v_active.starts_at,
      'ends_at', v_last.ends_at
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
    'ends_at', v_last.ends_at
  );
end $$;

revoke execute on function public.project_access_state(uuid) from public, anon;
grant execute on function public.project_access_state(uuid) to authenticated;
