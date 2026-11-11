-- Pencatatan keuangan: penjualan di luar website (Lynk.id, WhatsApp, offline) dan pengeluaran.
-- Penjualan lewat website (Midtrans) tetap dibaca dari tabel orders; halaman Keuangan menggabungkan ketiganya.
-- Hanya server dengan secret key (admin) yang boleh membaca dan menulis: RLS aktif tanpa policy.

create table if not exists public.sales (
  id              uuid primary key default gen_random_uuid(),
  sold_on         date not null default ((now() at time zone 'Asia/Jakarta')::date),   -- tanggal transaksi (WIB)
  buyer_name      text not null check (char_length(buyer_name) between 1 and 120),
  buyer_email     text check (buyer_email is null or char_length(buyer_email) <= 160),
  buyer_phone     text check (buyer_phone is null or char_length(buyer_phone) <= 20),  -- format internasional tanpa +, contoh 62812…
  channel         text not null default 'lynk' check (channel in ('lynk', 'whatsapp', 'offline', 'lainnya')),
  plan_id         uuid references public.plans(id) on delete set null,
  gross_idr       bigint not null check (gross_idr >= 0),                               -- yang dibayar pembeli
  fee_idr         bigint not null default 0 check (fee_idr >= 0),                       -- potongan platform atau biaya admin
  status          text not null default 'paid' check (status in ('paid', 'refunded')),
  reference       text check (reference is null or char_length(reference) <= 80),      -- nomor pesanan di platform
  notes           text check (notes is null or char_length(notes) <= 500),
  access_code_id  uuid references public.access_codes(id) on delete set null,          -- kode akses yang diterbitkan untuk pembeli ini
  refunded_at     timestamptz,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (fee_idr <= gross_idr)
);

create index if not exists sales_sold_on_idx on public.sales (sold_on desc);
create index if not exists sales_access_code_idx on public.sales (access_code_id);
-- Satu nomor pesanan hanya dicatat sekali per saluran, supaya pesanan yang sama tidak tercatat ganda
create unique index if not exists sales_channel_reference_uniq on public.sales (channel, reference) where reference is not null;

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  spent_on     date not null default ((now() at time zone 'Asia/Jakarta')::date),
  category     text not null default 'lainnya' check (category in ('hosting', 'iklan', 'biaya_platform', 'operasional', 'lainnya')),
  description  text not null check (char_length(description) between 1 and 200),
  amount_idr   bigint not null check (amount_idr > 0),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists expenses_spent_on_idx on public.expenses (spent_on desc);

alter table public.sales enable row level security;
alter table public.expenses enable row level security;
