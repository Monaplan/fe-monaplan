"use server";

import { createClient } from "@/lib/supabase/server";

const COLUMNS = "id, type, title, body, link_path, read_at, created_at";

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

// Daftar terbaru untuk polling cadangan dan penyegaran panel. RLS membatasi ke milik sendiri.
export async function fetchNotifications() {
  const { supabase, userId } = await currentUserId();
  if (!userId) return [];
  const { data } = await supabase.from("notifications").select(COLUMNS).eq("channel", "in_app").eq("user_id", userId)
    .lte("scheduled_for", new Date().toISOString()).order("created_at", { ascending: false }).limit(15);
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  const { supabase, userId } = await currentUserId();
  if (!userId || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).is("read_at", null);
}

export async function markNotificationsRead() {
  const { supabase, userId } = await currentUserId();
  if (!userId) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).eq("channel", "in_app").is("read_at", null);
}
