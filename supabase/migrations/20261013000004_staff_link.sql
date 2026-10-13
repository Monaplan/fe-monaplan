-- Tautan panitia: halaman hari H tanpa login untuk keluarga atau penerima tamu.
-- staff_token kosong berarti tautan mati. Hanya server (service role) yang membaca data lewat token ini.

alter table public.wedding_projects
  add column if not exists staff_token text,
  add column if not exists staff_can_record_gifts boolean not null default false;

create unique index if not exists wedding_projects_staff_token_uk on public.wedding_projects (staff_token) where staff_token is not null;

-- Rute baru tahap 1 (/panitia, /q, /offline) dicadangkan agar tidak dipakai sebagai slug undangan
create or replace function public.reserved_slug(p text) returns boolean
language sql immutable as $$
  select p = any (array[
    'app', 'admin', 'akun', 'aktivasi', 'api', 'auth', 'checkout', 'gabung', 'login', 'mulai', 'onboarding',
    'privasi', 'rsvp', 'reset-password', 'lupa-password', 'icon', 'apple-icon', 'manifest', 'robots', 'sitemap',
    'opengraph-image', 'favicon', 'proyek', 'panitia', 'q', 'offline', 'sw'
  ])
$$;
