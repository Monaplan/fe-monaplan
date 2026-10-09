-- Jadwalkan pengingat tiap 15 menit lewat endpoint aplikasi (PRD bagian 9).
-- Jalankan sekali di SQL Editor Supabase. Ganti <DOMAIN> dan <CRON_SECRET> (nilai yang sama dengan CRON_SECRET di environment aplikasi).
-- Jangan commit file berisi rahasia asli.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'monaplan-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<DOMAIN>/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

-- Menghapus jadwal lama dari versi Edge Function, bila ada:
-- select cron.unschedule('send-reminders');
