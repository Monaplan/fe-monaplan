"use server";

import { revalidatePath } from "next/cache";
import { getProjectContext } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/google/crypto";
import { googleConfigured, revokeToken } from "@/lib/google/oauth";
import { syncProject } from "@/lib/google/sync";
import { dbError, fail, type ActionResult } from "@/lib/result";

// Semua aksi memeriksa keanggotaan proyek lewat getProjectContext, lalu bekerja dengan secret key
// karena tabel Google sengaja tanpa policy RLS (token tidak boleh sampai ke browser).
async function ctx(projectId: string) {
  const { session } = await getProjectContext(projectId);
  if (!googleConfigured()) throw new Error("NOT_CONFIGURED");
  return { userId: session.user.id, admin: createAdminClient() };
}

const notConfigured = () => fail("Google Calendar belum diaktifkan di server ini. Hubungi admin.");

export async function enableProjectSync(projectId: string): Promise<ActionResult> {
  let c;
  try { c = await ctx(projectId); } catch { return notConfigured(); }
  const { data: link } = await c.admin.from("google_calendar_links").select("user_id").eq("user_id", c.userId).maybeSingle();
  if (!link) return fail("Hubungkan akun Google terlebih dahulu.");
  const { error } = await c.admin.from("google_calendar_syncs").upsert({ user_id: c.userId, project_id: projectId }, { onConflict: "user_id,project_id", ignoreDuplicates: true });
  if (error) return dbError(error);
  const r = await syncProject(c.userId, projectId);
  revalidatePath(`/w/${projectId}/kalender`);
  return r.ok ? { ok: true, message: `Tersinkron: ${r.message}.` } : fail(r.error);
}

export async function syncGoogleNow(projectId: string): Promise<ActionResult> {
  let c;
  try { c = await ctx(projectId); } catch { return notConfigured(); }
  const r = await syncProject(c.userId, projectId);
  revalidatePath(`/w/${projectId}/kalender`);
  return r.ok ? { ok: true, message: r.failed ? `Selesai dengan ${r.failed} kegagalan.` : `Tersinkron: ${r.message}.` } : fail(r.error);
}

export async function setGoogleAutoSync(projectId: string, on: boolean): Promise<ActionResult> {
  let c;
  try { c = await ctx(projectId); } catch { return notConfigured(); }
  const { error } = await c.admin.from("google_calendar_syncs").update({ auto_sync: on }).eq("user_id", c.userId).eq("project_id", projectId);
  if (error) return dbError(error);
  revalidatePath(`/w/${projectId}/kalender`);
  return { ok: true, message: on ? "Sinkron otomatis dinyalakan." : "Sinkron otomatis dimatikan." };
}

// Berhenti menyinkronkan proyek ini. Event yang sudah ada di Google dibiarkan.
export async function stopProjectSync(projectId: string): Promise<ActionResult> {
  let c;
  try { c = await ctx(projectId); } catch { return notConfigured(); }
  const { error } = await c.admin.from("google_calendar_syncs").delete().eq("user_id", c.userId).eq("project_id", projectId);
  if (error) return dbError(error);
  revalidatePath(`/w/${projectId}/kalender`);
  return { ok: true, message: "Sinkronisasi proyek ini dihentikan. Event di Google tidak dihapus." };
}

// Putuskan akun Google dari seluruh proyek: cabut izin di Google lalu hapus token dan tautan
export async function disconnectGoogle(projectId: string): Promise<ActionResult> {
  const { session } = await getProjectContext(projectId);
  const admin = createAdminClient();
  const userId = session.user.id;
  const { data: link } = await admin.from("google_calendar_links").select("refresh_token_enc").eq("user_id", userId).maybeSingle();
  if (link) {
    try { await revokeToken(decryptToken(link.refresh_token_enc)); } catch {}
  }
  await admin.from("google_calendar_syncs").delete().eq("user_id", userId);
  const { error } = await admin.from("google_calendar_links").delete().eq("user_id", userId);
  if (error) return dbError(error);
  revalidatePath(`/w/${projectId}/kalender`);
  return { ok: true, message: "Google Calendar diputuskan." };
}
