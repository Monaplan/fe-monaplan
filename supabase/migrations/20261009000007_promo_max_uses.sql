-- Batas pemakaian promo (total). Kosong berarti tanpa batas.
alter table public.promos add column if not exists max_uses integer;
do $$ begin
  alter table public.promos add constraint promos_max_uses_positive check (max_uses is null or max_uses > 0);
exception when duplicate_object then null; end $$;
