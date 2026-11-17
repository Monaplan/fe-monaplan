-- Konteks ruang kerja dalam satu panggilan. Layout dan halaman ruang kerja sebelumnya memakai 7-8 kueri terpisah pada
-- setiap muat (proyek, anggota, status akses, tugas terlambat, RSVP baru, undangan menunggu, notifikasi), dan itu terulang
-- setiap kali sebuah aksi memuat ulang layout. Fungsi ini mengembalikan semuanya sebagai satu jsonb.
--
-- SECURITY INVOKER (bawaan): berjalan dengan hak pengguna yang memanggil, jadi RLS tabel tetap berlaku seperti pada kueri
-- terpisah. Pengguna yang bukan anggota proyek mendapat project = null dan members = []. Status akses memakai fungsi lama
-- project_access_state (SECURITY DEFINER) yang sudah ada.

create or replace function public.workspace_context(p_project_id uuid) returns jsonb
language sql stable security invoker set search_path = public as $$
  with p as (
    select * from public.wedding_projects where id = p_project_id
  ), today as (
    -- "hari ini" menurut zona waktu proyek, sama dengan todayISO() di aplikasi
    select (now() at time zone coalesce((select timezone from p), 'Asia/Jakarta'))::date as d
  )
  select jsonb_build_object(
    'project', (select to_jsonb(p) from p),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'role', m.role,
        'profiles', case when pr.id is null then null else jsonb_build_object('full_name', pr.full_name, 'email', pr.email, 'avatar_url', pr.avatar_url) end
      ) order by m.joined_at)
      from public.project_members m left join public.profiles pr on pr.id = m.user_id
      where m.project_id = p_project_id
    ), '[]'::jsonb),
    -- project_access_state menolak non-anggota dengan galat; di sini non-anggota cukup mendapat null
    'access', case when exists (select 1 from public.project_members mm where mm.project_id = p_project_id and mm.user_id = auth.uid())
                  then public.project_access_state(p_project_id) end,
    'overdue', (select count(*) from public.tasks t where t.project_id = p_project_id and t.status <> 'done' and t.due_date < (select d from today)),
    'rsvp_new', (select count(*) from public.guests g where g.project_id = p_project_id and g.rsvp_responded_at >= now() - interval '7 days'),
    'pending_inv', (select count(*) from public.project_invitations i where i.project_id = p_project_id and i.status = 'pending'),
    'notifications', coalesce((
      select jsonb_agg(to_jsonb(n) order by n.created_at desc)
      from (
        select id, type, title, body, link_path, read_at, created_at
        from public.notifications
        where channel = 'in_app' and user_id = auth.uid() and scheduled_for <= now()
        order by created_at desc limit 15
      ) n
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.workspace_context(uuid) from public, anon;
grant execute on function public.workspace_context(uuid) to authenticated;
