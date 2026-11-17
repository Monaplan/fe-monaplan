-- Pengerasan keamanan (hasil audit 2026-11).
-- 1) Kolom tautan buatan pengguna hanya boleh http(s). Dibuat NOT VALID: baris lama tidak diperiksa ulang (tidak gagal bila
--    ada data lama), tetapi setiap simpan baru wajib sah. Aplikasi juga memvalidasi dan menyaring saat tampil.
-- 2) Fungsi pembantu lisensi tidak lagi bisa dipanggil tanpa login lewat RPC. Pengguna login dan service_role tetap bisa
--    (dipakai kebijakan RLS dan fungsi lain).

alter table public.wedding_events drop constraint if exists wedding_events_maps_url_http;
alter table public.wedding_events add constraint wedding_events_maps_url_http
  check (maps_url is null or maps_url ~* '^https?://') not valid;

alter table public.gift_items drop constraint if exists gift_items_purchase_url_http;
alter table public.gift_items add constraint gift_items_purchase_url_http
  check (purchase_url is null or purchase_url ~* '^https?://') not valid;

alter table public.vendors drop constraint if exists vendors_website_http;
alter table public.vendors add constraint vendors_website_http
  check (website is null or website ~* '^https?://') not valid;

alter table public.inspiration_items drop constraint if exists inspiration_items_link_url_http;
alter table public.inspiration_items add constraint inspiration_items_link_url_http
  check (link_url is null or link_url ~* '^https?://') not valid;

revoke execute on function public.has_active_license(uuid) from public, anon;
revoke execute on function public.has_lifetime_license(uuid) from public, anon;
revoke execute on function public.next_license_start(uuid) from public, anon;
revoke execute on function public.lifetime_tier(uuid) from public, anon;
revoke execute on function public.can_upgrade_to(uuid, uuid) from public, anon;
grant execute on function public.has_active_license(uuid), public.has_lifetime_license(uuid), public.next_license_start(uuid),
  public.lifetime_tier(uuid), public.can_upgrade_to(uuid, uuid) to authenticated, service_role;
