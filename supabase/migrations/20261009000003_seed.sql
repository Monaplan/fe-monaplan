-- Paket dan template checklist default

insert into public.plans (code, name, description, type, duration_days, price_idr, max_projects, max_collaborators, sort_order)
values
  ('TIMED_12M', 'Monaplan 12 Bulan', 'Semua fitur, aktif 12 bulan, bisa diperpanjang', 'timed', 365, 99000, 1, 3, 1),
  ('LIFETIME', 'Monaplan Selamanya', 'Semua fitur, sekali bayar, akses selamanya', 'lifetime', null, 199000, 1, 3, 2);
-- Harga hanya contoh, sesuaikan

insert into public.checklist_templates (title, category, phase_key, offset_days, priority, sort_order) values
  ('Tentukan tanggal dan konsep pernikahan',            'Perencanaan',       'm12_plus', 400, 'high',   1),
  ('Sepakati total budget bersama keluarga',            'Budget',            'm12_plus', 380, 'high',   2),
  ('Susun daftar tamu awal',                            'Tamu',              'm12_plus', 365, 'medium', 3),
  ('Survei dan booking venue',                          'Vendor',            'm12_6',    330, 'high',   4),
  ('Booking katering dan jadwalkan test food',          'Vendor',            'm12_6',    300, 'high',   5),
  ('Pilih WO atau tim koordinator',                     'Vendor',            'm12_6',    270, 'medium', 6),
  ('Booking fotografer dan videografer',                'Vendor',            'm12_6',    240, 'medium', 7),
  ('Pilih busana dan MUA',                              'Busana & Rias',     'm6_3',     180, 'medium', 8),
  ('Booking dekorasi dan hiburan',                      'Vendor',            'm6_3',     150, 'medium', 9),
  ('Pesan cincin pernikahan',                           'Mahar & Seserahan', 'm6_3',     120, 'medium', 10),
  ('Kumpulkan dokumen administrasi nikah',              'Administrasi',      'm6_3',     100, 'high',   11),
  ('Daftarkan pernikahan ke KUA atau catatan sipil',    'Administrasi',      'm3_1',     90,  'high',   12),
  ('Finalisasi daftar tamu dan kirim undangan',         'Tamu',              'm3_1',     75,  'high',   13),
  ('Beli mahar dan seserahan',                          'Mahar & Seserahan', 'm3_1',     60,  'medium', 14),
  ('Fitting busana pertama',                            'Busana & Rias',     'm3_1',     45,  'medium', 15),
  ('Finalisasi rundown bersama WO',                     'Rundown',           'm1',       30,  'high',   16),
  ('Rekap RSVP dan konfirmasi jumlah porsi ke katering','Tamu',              'm1',       21,  'high',   17),
  ('Lunasi vendor sesuai jadwal',                       'Budget',            'm1',       14,  'high',   18),
  ('Briefing keluarga dan panitia',                     'Rundown',           'w1',       7,   'medium', 19),
  ('Siapkan amplop dan uang tunai untuk keperluan hari H','Budget',          'w1',       3,   'medium', 20),
  ('Pastikan semua vendor hadir sesuai rundown',        'Hari H',            'hari_h',   0,   'high',   21),
  ('Ambil hasil foto dan video',                        'Vendor',            'pasca',    -14, 'low',    22),
  ('Perbarui status perkawinan di KK dan KTP',          'Administrasi',      'pasca',    -30, 'medium', 23);
