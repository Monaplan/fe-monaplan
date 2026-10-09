-- Jadwalkan Edge Function send-reminders tiap 15 menit (PRD bagian 9).
-- Jalankan sekali di SQL Editor Supabase setelah function di-deploy.
-- Ganti <PROJECT_REF> dan <SERVICE_ROLE_KEY>. Jangan commit file berisi key asli.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
