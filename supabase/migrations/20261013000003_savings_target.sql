-- Target tabungan nikah: dana yang sudah terkumpul. Target per bulan dihitung di aplikasi.

alter table public.wedding_projects
  add column if not exists savings_idr bigint not null default 0,
  add column if not exists savings_updated_at timestamptz;

do $$ begin
  alter table public.wedding_projects add constraint wedding_projects_savings_nonneg check (savings_idr >= 0);
exception when duplicate_object then null; end $$;
