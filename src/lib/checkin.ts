import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CheckinGuest = {
  id: string; name: string; category: string; group: string | null; pax_invited: number; pax_confirmed: number; rsvp_status: string;
  checkin_code: string; checked_in_at: string | null; checked_in_pax: number | null;
  side?: string; checked_in_by?: string | null;
};
export type CheckinResult = { guest_id: string; name: string; already: boolean; checked_in_at: string; checked_in_pax: number | null };
type Res<T> = { ok: true; result: T } | { ok: false; error: string };

// Kode boleh berupa kode mentah atau URL QR (<domain>/q/<kode>)
export function extractCode(raw: string): string | null {
  const s = raw.trim();
  const m = s.match(/\/q\/([A-Za-z0-9]{6,20})\/?(?:[?#].*)?$/) ?? s.match(/^([A-Za-z0-9]{6,20})$/);
  return m ? m[1]!.toUpperCase() : null;
}

export async function listCheckinGuests(db: SupabaseClient, projectId: string): Promise<CheckinGuest[]> {
  const { data, error } = await db.from("guests")
    .select("id, name, category, side, pax_invited, pax_confirmed, rsvp_status, checkin_code, checked_in_at, checked_in_pax, checked_in_by, guest_groups(name)")
    .eq("project_id", projectId).order("name").limit(5000);
  if (error) return [];
  return (data ?? []).map((g: any) => ({ ...g, group: g.guest_groups?.name ?? null, guest_groups: undefined }));
}

export async function checkinByCode(admin: SupabaseClient, projectId: string, raw: string, pax: number | null, by: string): Promise<Res<CheckinResult>> {
  const code = extractCode(raw);
  if (!code) return { ok: false, error: "QR tidak dikenali." };
  const safePax = pax == null ? null : Math.max(0, Math.min(50, Math.round(pax)));
  const { data, error } = await admin.rpc("checkin_guest", { p_project_id: projectId, p_code: code, p_pax: safePax, p_by: by.slice(0, 80) });
  if (error) return { ok: false, error: error.message.includes("CHECKIN_NOT_FOUND") ? "QR tidak dikenali." : "Check-in gagal. Coba lagi, ya." };
  return { ok: true, result: data as CheckinResult };
}

// Tamu yang datang tanpa terdaftar: dibuat sebagai tamu baru (hadir) lalu langsung di-check-in
export async function walkInGuest(admin: SupabaseClient, projectId: string, rawName: string, pax: number, by: string): Promise<Res<CheckinResult>> {
  const name = rawName.replace(/\s+/g, " ").trim().slice(0, 120);
  if (name.length < 2) return { ok: false, error: "Tulis nama tamu dulu, ya." };
  const n = Math.max(1, Math.min(20, Math.round(pax) || 1));
  const { data, error } = await admin.from("guests")
    .insert({ project_id: projectId, name, pax_invited: n, pax_confirmed: n, rsvp_status: "hadir", rsvp_responded_at: new Date().toISOString(), self_registered: true, notes: "Datang tanpa terdaftar (check-in hari H)" })
    .select("checkin_code").single();
  if (error || !data) return { ok: false, error: "Gagal menambah tamu. Coba lagi, ya." };
  return checkinByCode(admin, projectId, data.checkin_code, n, by);
}

// Tamu yang sudah check-in, urut waktu masuk. null bila kolom check-in belum ada (migrasi 20261013000006 belum dijalankan).
export async function listArrivedGuests(db: SupabaseClient, projectId: string): Promise<CheckinGuest[] | null> {
  const { data, error } = await db.from("guests")
    .select("id, name, category, side, pax_invited, pax_confirmed, rsvp_status, checkin_code, checked_in_at, checked_in_pax, checked_in_by, guest_groups(name)")
    .eq("project_id", projectId).not("checked_in_at", "is", null).order("checked_in_at", { ascending: true }).limit(5000);
  if (error) return null;
  return (data ?? []).map((g: any) => ({ ...g, group: g.guest_groups?.name ?? null, guest_groups: undefined }));
}
