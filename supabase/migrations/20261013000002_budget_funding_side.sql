-- Pembagian biaya per pihak: siapa yang menanggung tiap item budget, dan porsi pihak pria untuk biaya bersama.

alter table public.budget_items
  add column if not exists funded_by public.party_side not null default 'bersama';

alter table public.wedding_projects
  add column if not exists split_pria_pct smallint not null default 50;

do $$ begin
  alter table public.wedding_projects add constraint wedding_projects_split_pria_pct_range check (split_pria_pct between 0 and 100);
exception when duplicate_object then null; end $$;
