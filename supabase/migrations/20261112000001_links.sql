-- Shortlink dan bio link milik admin Monaplan (pemasaran): /s/<slug> mengalihkan ke tujuan, /bio menampilkan halaman tautan.
-- Hanya server dengan secret key yang membaca dan menulis: RLS aktif tanpa policy. Klik dihitung lewat fungsi atomik.

create table if not exists public.short_links (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (char_length(slug) between 2 and 40 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  target_url       text not null check (char_length(target_url) <= 2000 and target_url ~* '^https?://'),
  title            text check (title is null or char_length(title) <= 120),
  is_active        boolean not null default true,
  expires_at       timestamptz,
  click_count      bigint not null default 0 check (click_count >= 0),
  last_clicked_at  timestamptz,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.bio_links (
  id           uuid primary key default gen_random_uuid(),
  label        text not null check (char_length(label) between 1 and 60),
  url          text not null check (char_length(url) <= 2000 and url ~* '^https?://'),
  icon         text not null default 'link' check (char_length(icon) <= 20),
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  click_count  bigint not null default 0 check (click_count >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists bio_links_sort_idx on public.bio_links (sort_order, created_at);

-- Penghitung sederhana (mis. jumlah kunjungan halaman bio), ditambah satu per panggilan
create table if not exists public.link_stats (
  key         text primary key check (char_length(key) <= 60),
  count       bigint not null default 0 check (count >= 0),
  updated_at  timestamptz not null default now()
);

alter table public.short_links enable row level security;
alter table public.bio_links enable row level security;
alter table public.link_stats enable row level security;

-- Satu perintah: tambah klik sekaligus ambil tujuan, hanya untuk tautan aktif yang belum kedaluwarsa. Tidak ada celah balapan.
create or replace function public.hit_short_link(p_slug text) returns text
language sql security definer set search_path = public as $$
  update public.short_links
  set click_count = click_count + 1, last_clicked_at = now()
  where slug = lower(p_slug) and is_active and (expires_at is null or expires_at > now())
  returning target_url
$$;

create or replace function public.hit_bio_link(p_id uuid) returns text
language sql security definer set search_path = public as $$
  update public.bio_links
  set click_count = click_count + 1
  where id = p_id and is_active
  returning url
$$;

create or replace function public.bump_stat(p_key text) returns void
language sql security definer set search_path = public as $$
  insert into public.link_stats (key, count) values (p_key, 1)
  on conflict (key) do update set count = public.link_stats.count + 1, updated_at = now()
$$;

revoke execute on function public.hit_short_link(text) from public, anon, authenticated;
revoke execute on function public.hit_bio_link(uuid) from public, anon, authenticated;
revoke execute on function public.bump_stat(text) from public, anon, authenticated;
grant execute on function public.hit_short_link(text) to service_role;
grant execute on function public.hit_bio_link(uuid) to service_role;
grant execute on function public.bump_stat(text) to service_role;

-- Rute baru dicadangkan agar tidak dipakai sebagai alamat undangan: terima-kasih (halaman setelah checkout),
-- s (shortlink), b (klik bio link), bio (halaman bio). Harus sama dengan RESERVED_SLUGS di src/lib/paths.ts.
create or replace function public.reserved_slug(p text) returns boolean
language sql immutable as $$
  select p = any (array[
    'app', 'admin', 'akun', 'aktivasi', 'api', 'auth', 'checkout', 'gabung', 'login', 'mulai', 'onboarding',
    'privasi', 'rsvp', 'reset-password', 'lupa-password', 'icon', 'apple-icon', 'manifest', 'robots', 'sitemap',
    'opengraph-image', 'favicon', 'proyek', 'panitia', 'q', 'offline', 'sw', 'terima-kasih', 's', 'b', 'bio'
  ])
$$;
