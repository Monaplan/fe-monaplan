import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleConfigured } from "./oauth";

// Menambah agenda mewajibkan Google Calendar tersambung agar pengingatnya sampai ke HP. Bila Google belum dikonfigurasi di server
// (GOOGLE_CLIENT_ID/SECRET kosong), kewajiban ini dilewati supaya aplikasi tetap bisa dipakai.
export async function googleLinked(userId: string): Promise<boolean> {
  if (!googleConfigured()) return true;
  const { data } = await createAdminClient().from("google_calendar_links").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}
