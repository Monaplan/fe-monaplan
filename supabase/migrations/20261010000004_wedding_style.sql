-- Gaya pernikahan (adat). Template Umum selalu terpasang; adat hanya MENAMBAH tugas checklist dan kategori budget.
-- Isi tugas adat adalah draf awal: istilah dan urutan bisa berbeda antardaerah, jadi periksa lalu koreksi lewat tabel checklist_templates.

alter table public.wedding_projects
  add column if not exists wedding_style text not null default 'umum';
alter table public.wedding_projects drop constraint if exists wedding_projects_style_check;
alter table public.wedding_projects
  add constraint wedding_projects_style_check check (wedding_style in ('umum', 'jawa', 'sunda', 'bali', 'minang', 'batak'));

alter table public.checklist_templates
  add column if not exists style text not null default 'umum';
alter table public.checklist_templates drop constraint if exists checklist_templates_style_check;
alter table public.checklist_templates
  add constraint checklist_templates_style_check check (style in ('umum', 'jawa', 'sunda', 'bali', 'minang', 'batak'));

-- Aman dijalankan ulang: template adat yang belum dipakai tugas mana pun dibuat ulang tanpa menggandakan
delete from public.checklist_templates
where style <> 'umum' and not exists (select 1 from public.tasks x where x.template_id = checklist_templates.id);

insert into public.checklist_templates (title, category, phase_key, offset_days, priority, sort_order, style)
select v.title, v.category, v.phase_key, v.offset_days, v.priority::public.task_priority, v.sort_order, v.style
from (values
  ('Tanyakan hari baik (weton) ke sesepuh keluarga',                   'Adat', 'm12_6', 270, 'high',   101, 'jawa'),
  ('Tentukan rangkaian adat: lamaran, siraman, midodareni, panggih',   'Adat', 'm12_6', 240, 'high',   102, 'jawa'),
  ('Pesan paes, busana adat, dan juru rias pengantin',                 'Adat', 'm6_3',  150, 'medium', 103, 'jawa'),
  ('Siapkan perlengkapan siraman dan sesaji',                          'Adat', 'm3_1',  45,  'medium', 104, 'jawa'),
  ('Susun urutan siraman, midodareni, ijab, dan panggih',              'Adat', 'm1',    21,  'high',   105, 'jawa'),
  ('Pasang tarub dan bleketepe bersama keluarga',                      'Adat', 'm1',    3,   'medium', 106, 'jawa'),

  ('Tentukan rangkaian adat Sunda bersama keluarga besar',             'Adat', 'm12_6', 240, 'high',   101, 'sunda'),
  ('Pesan busana adat Sunda dan siger',                                'Adat', 'm6_3',  150, 'medium', 102, 'sunda'),
  ('Siapkan perlengkapan ngeuyeuk seureuh',                            'Adat', 'm3_1',  30,  'medium', 103, 'sunda'),
  ('Atur jadwal siraman dan prosesi nyawer',                           'Adat', 'm1',    21,  'medium', 104, 'sunda'),
  ('Siapkan perlengkapan huap lingkung dan sawer',                     'Adat', 'm1',    10,  'medium', 105, 'sunda'),

  ('Tentukan hari baik (dewasa ayu) bersama pemangku atau griya',      'Adat', 'm12_6', 270, 'high',   101, 'bali'),
  ('Hubungi pemangku atau pendeta untuk upacara',                      'Adat', 'm12_6', 240, 'high',   102, 'bali'),
  ('Pesan busana payas agung atau payas madya dan juru rias',          'Adat', 'm6_3',  150, 'medium', 103, 'bali'),
  ('Siapkan banten dan upakara bersama keluarga',                      'Adat', 'm3_1',  45,  'high',   104, 'bali'),
  ('Atur urutan prosesi: mesedek, mekala-kalaan, dan lainnya',         'Adat', 'm1',    21,  'high',   105, 'bali'),

  ('Tentukan rangkaian adat Minang bersama ninik mamak',               'Adat', 'm12_6', 240, 'high',   101, 'minang'),
  ('Atur prosesi maminang dan batimbang tando',                        'Adat', 'm6_3',  180, 'high',   102, 'minang'),
  ('Pesan pelaminan, busana adat, dan suntiang',                       'Adat', 'm6_3',  120, 'medium', 103, 'minang'),
  ('Atur prosesi manjapuik marapulai dan baralek',                     'Adat', 'm1',    21,  'high',   104, 'minang'),
  ('Siapkan malam bainai',                                             'Adat', 'm1',    7,   'medium', 105, 'minang'),

  ('Tentukan rangkaian adat Batak bersama dalihan na tolu',            'Adat', 'm12_6', 240, 'high',   101, 'batak'),
  ('Atur marhusip dan marhori-hori dinding',                           'Adat', 'm6_3',  180, 'high',   102, 'batak'),
  ('Atur martumpol dan pemberkatan di gereja',                         'Adat', 'm3_1',  75,  'high',   103, 'batak'),
  ('Siapkan ulos dan perlengkapan mangulosi',                          'Adat', 'm3_1',  60,  'medium', 104, 'batak'),
  ('Siapkan tudu-tudu sipanganon dan jambar',                          'Adat', 'm3_1',  30,  'medium', 105, 'batak')
) as v(title, category, phase_key, offset_days, priority, sort_order, style);

create or replace function public.seed_project_defaults(p_project_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_date date; v_style text;
begin
  if not public.can_write_project(p_project_id) then
    raise exception 'FORBIDDEN';
  end if;

  select wedding_date, wedding_style into v_date, v_style from public.wedding_projects where id = p_project_id;

  insert into public.budget_categories (project_id, name, sort_order)
  select p_project_id, c.name, c.ord
  from unnest(array[
    'Venue', 'Katering', 'Dekorasi', 'Busana & Rias', 'Dokumentasi', 'Hiburan',
    'Undangan & Souvenir', 'Mahar & Seserahan', 'Cincin', 'Administrasi',
    'Transportasi & Akomodasi', 'Dana Darurat'
  ]) with ordinality as c(name, ord)
  on conflict (project_id, name) do nothing;

  -- Kategori tambahan sesuai adat
  insert into public.budget_categories (project_id, name, sort_order)
  select p_project_id, c.name, 12 + c.ord
  from unnest(case v_style
    when 'jawa'   then array['Prosesi adat', 'Sesaji']
    when 'sunda'  then array['Prosesi adat']
    when 'bali'   then array['Upakara & Banten']
    when 'minang' then array['Prosesi adat', 'Pelaminan']
    when 'batak'  then array['Adat & Ulos']
    else array[]::text[] end) with ordinality as c(name, ord)
  on conflict (project_id, name) do nothing;

  insert into public.tasks (project_id, template_id, title, description, category,
                            phase_key, priority, due_date, sort_order, is_from_template)
  select p_project_id, t.id, t.title, t.description, t.category, t.phase_key, t.priority,
         case when v_date is null then null else v_date - t.offset_days end,
         t.sort_order, true
  from public.checklist_templates t
  where t.is_active
    and t.style in ('umum', v_style)
    and not exists (select 1 from public.tasks x
                    where x.project_id = p_project_id and x.template_id = t.id);

  if not exists (select 1 from public.document_checklist_items where project_id = p_project_id) then
    insert into public.document_checklist_items (project_id, name, side, sort_order)
    values
      (p_project_id, 'KTP', 'pria', 1),
      (p_project_id, 'Kartu Keluarga', 'pria', 2),
      (p_project_id, 'Akta kelahiran', 'pria', 3),
      (p_project_id, 'Pas foto sesuai ketentuan', 'pria', 4),
      (p_project_id, 'Surat pengantar RT/RW dan kelurahan', 'pria', 5),
      (p_project_id, 'KTP', 'wanita', 6),
      (p_project_id, 'Kartu Keluarga', 'wanita', 7),
      (p_project_id, 'Akta kelahiran', 'wanita', 8),
      (p_project_id, 'Pas foto sesuai ketentuan', 'wanita', 9),
      (p_project_id, 'Surat pengantar RT/RW dan kelurahan', 'wanita', 10),
      (p_project_id, 'Surat izin orang tua (bila diperlukan)', 'bersama', 11);
  end if;

  if not exists (select 1 from public.message_templates where project_id = p_project_id) then
    insert into public.message_templates (project_id, name, body, is_default)
    values (p_project_id, 'Undangan standar',
      E'Halo {nama_tamu},\n\nDengan penuh rasa syukur, kami {nama_pasangan} bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir di hari bahagia kami.\n\n{detail_acara}\n\nMohon kesediaannya mengonfirmasi kehadiran melalui tautan berikut:\n{link_rsvp}\n\nTerima kasih atas doa dan restunya.',
      true);
  end if;

  update public.wedding_projects
  set onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = p_project_id;
end $$;

revoke execute on function public.seed_project_defaults(uuid) from public, anon;
grant execute on function public.seed_project_defaults(uuid) to authenticated;
