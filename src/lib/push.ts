import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { projectPath } from "@/lib/paths";

// Push notification lewat standar Web Push (VAPID), tanpa layanan pihak ketiga (PRD 21.5).
// Bila kunci VAPID belum diisi, semua fungsi di sini diam-diam tidak melakukan apa pun.
export type PushPayload = { title: string; body: string; url: string; tag?: string };

let configured: boolean | null = null;
export function pushConfigured() {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  configured = !!(pub && priv);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@monaplan.app", pub!, priv!);
  return configured;
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

// Kirim ke semua perangkat milik pengguna. Langganan yang sudah mati (404/410) dihapus.
export async function sendPush(admin: SupabaseClient, userIds: string[], payload: PushPayload): Promise<number> {
  if (!pushConfigured() || !userIds.length) return 0;
  const { data, error } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", [...new Set(userIds)]);
  if (error || !data?.length) return 0;
  const body = JSON.stringify({ ...payload, body: payload.body.slice(0, 180) });
  const dead: string[] = [], used: string[] = [];
  let sent = 0;
  await Promise.all((data as Sub[]).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 6 * 3600, urgency: "normal" });
      sent++; used.push(s.id);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) dead.push(s.id);
    }
  }));
  if (dead.length) await admin.from("push_subscriptions").delete().in("id", dead);
  if (used.length) await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).in("id", used);
  return sent;
}

// RSVP baru: owner dan editor proyek
export async function notifyRsvp(admin: SupabaseClient, project: { id: string; slug: string | null }, name: string, status: string, pax: number) {
  if (!pushConfigured()) return;
  const { data: members } = await admin.from("project_members").select("user_id, role").eq("project_id", project.id).neq("role", "viewer");
  const label = status === "hadir" ? `Hadir, ${pax} orang` : status === "tidak_hadir" ? "Tidak hadir" : "Masih ragu";
  await sendPush(admin, (members ?? []).map((m) => m.user_id as string), {
    title: "RSVP baru", body: `${name.slice(0, 60)}: ${label}`, url: projectPath(project, "tamu"), tag: `rsvp:${project.id}`,
  });
}
