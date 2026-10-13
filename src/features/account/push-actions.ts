"use server";

import { z } from "zod";
import { requireUser } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, type ActionResult } from "@/lib/result";
import { pushConfigured, sendPush } from "@/lib/push";

const Sub = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "endpoint"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

// Simpan langganan push perangkat ini. Endpoint yang sama (perangkat sama, akun berganti) dipindahkan ke akun yang sedang masuk.
export async function savePushSubscription(raw: unknown, userAgent: string): Promise<ActionResult> {
  const { user } = await requireUser();
  if (!pushConfigured()) return fail("Notifikasi HP belum diaktifkan di server.");
  const parsed = Sub.safeParse(raw);
  if (!parsed.success) return fail("Langganan notifikasi tidak valid.");
  const s = parsed.data;
  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint).neq("user_id", user.id);
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, user_agent: userAgent.slice(0, 300) },
    { onConflict: "endpoint" },
  );
  if (error) return fail(error.code === "42P01" ? "Tabel notifikasi HP belum ada. Jalankan migrasi 20261013000005_push_subscriptions.sql di Supabase." : "Gagal menyimpan langganan notifikasi.");
  return { ok: true, message: "Notifikasi di perangkat ini aktif." };
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true, message: "Notifikasi di perangkat ini dimatikan." };
}

export async function sendTestPush(): Promise<ActionResult> {
  const { user } = await requireUser();
  const sent = await sendPush(createAdminClient(), [user.id], { title: "Monaplan", body: "Notifikasi HP sudah aktif. Pengingat akan muncul seperti ini.", url: "/akun", tag: "test" });
  return sent ? { ok: true, message: "Notifikasi tes terkirim." } : fail("Belum ada perangkat yang menerima. Aktifkan dulu notifikasi di perangkat ini.");
}
