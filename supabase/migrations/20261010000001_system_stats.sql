-- Statistik sistem untuk panel admin: ukuran database, tabel terbesar, jumlah koneksi.
-- Hanya bisa dipanggil lewat secret key (service_role).
create or replace function public.admin_system_stats()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'connections', (select count(*) from pg_stat_activity where datname = current_database()),
    'tables', coalesce((
      select jsonb_agg(t order by t.bytes desc) from (
        select relname as name, pg_total_relation_size(relid) as bytes, n_live_tup as rows
        from pg_stat_user_tables where schemaname = 'public'
        order by pg_total_relation_size(relid) desc limit 8
      ) t
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.admin_system_stats() from public, anon, authenticated;
grant execute on function public.admin_system_stats() to service_role;
