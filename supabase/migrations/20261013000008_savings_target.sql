-- Target tabungan yang bisa diatur sendiri. Kosong (null) berarti memakai hitungan otomatis:
-- jumlah target = sisa tagihan vendor, batas waktu = 14 hari sebelum hari H.

alter table public.wedding_projects
  add column if not exists savings_target_idr bigint,
  add column if not exists savings_deadline   date;

do $$ begin
  alter table public.wedding_projects add constraint wedding_projects_savings_target_positive check (savings_target_idr is null or savings_target_idr > 0);
exception when duplicate_object then null; end $$;
