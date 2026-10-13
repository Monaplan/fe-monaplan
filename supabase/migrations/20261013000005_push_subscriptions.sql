-- Langganan push notification, satu baris per perangkat. Pengiriman memakai service role.

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text check (user_agent is null or char_length(user_agent) <= 300),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_select on public.push_subscriptions;
drop policy if exists push_subscriptions_insert on public.push_subscriptions;
drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
