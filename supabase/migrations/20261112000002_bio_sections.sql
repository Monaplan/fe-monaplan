-- Bio link tahap 2: section (kelompok tautan, biasa atau dropdown yang bisa dilipat), tautan unggulan,
-- label kecil, deskripsi satu baris, dan kartu ajakan (tautan dengan tombol). Hanya server yang membaca dan menulis (RLS tanpa policy).

create table if not exists public.bio_sections (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 60),
  kind        text not null default 'normal' check (kind in ('normal', 'dropdown')),
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.bio_sections enable row level security;

-- Tautan di dalam section; section dihapus: tautannya tetap ada tanpa section
alter table public.bio_links
  add column if not exists section_id   uuid references public.bio_sections(id) on delete set null,
  add column if not exists is_featured  boolean not null default false,
  add column if not exists badge        text check (badge is null or char_length(badge) <= 20),
  add column if not exists description  text check (description is null or char_length(description) <= 80),
  add column if not exists cta_label    text check (cta_label is null or char_length(cta_label) <= 24);

create index if not exists bio_links_section_idx on public.bio_links (section_id, sort_order);
