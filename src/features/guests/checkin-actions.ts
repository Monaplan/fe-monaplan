"use server";

import { revalidatePath } from "next/cache";
import { getProjectContext } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, type ActionResult } from "@/lib/result";
import { checkinByCode, listCheckinGuests, walkInGuest, type CheckinGuest, type CheckinResult } from "@/lib/checkin";

// Check-in dari ruang kerja: hanya owner dan editor dengan akses aktif (RPC checkin_guest hanya bisa dipanggil service role)
async function writer(projectId: string) {
  const ctx = await getProjectContext(projectId);
  return ctx.canWrite ? ctx : null;
}

export async function loadCheckinGuests(projectId: string): Promise<CheckinGuest[]> {
  const ctx = await getProjectContext(projectId);
  return listCheckinGuests(ctx.supabase, ctx.projectId);
}

export async function checkinGuestAction(projectId: string, code: string, pax: number | null): Promise<ActionResult & { result?: CheckinResult }> {
  const ctx = await writer(projectId);
  if (!ctx) return fail("Kamu tidak punya izin mengubah data ini, atau akses ruang kerja sudah berakhir.");
  const by = ctx.session.profile?.full_name ?? ctx.session.user.email ?? "Anggota";
  const r = await checkinByCode(createAdminClient(), ctx.projectId, code, pax, by);
  if (!r.ok) return fail(r.error);
  revalidatePath("/app/[projectId]/hari-h", "page");
  revalidatePath("/app/[projectId]/tamu-hadir", "page");
  return { ok: true, data: r.result, result: r.result };
}

export async function walkInAction(projectId: string, name: string, pax: number): Promise<ActionResult> {
  const ctx = await writer(projectId);
  if (!ctx) return fail("Kamu tidak punya izin mengubah data ini, atau akses ruang kerja sudah berakhir.");
  const by = ctx.session.profile?.full_name ?? ctx.session.user.email ?? "Anggota";
  const r = await walkInGuest(createAdminClient(), ctx.projectId, name, pax, by);
  if (!r.ok) return fail(r.error);
  revalidatePath("/app/[projectId]/hari-h", "page");
  revalidatePath("/app/[projectId]/tamu-hadir", "page");
  return { ok: true, data: r.result };
}

export async function undoCheckinAction(projectId: string, guestId: string): Promise<ActionResult> {
  const ctx = await writer(projectId);
  if (!ctx) return fail("Kamu tidak punya izin mengubah data ini, atau akses ruang kerja sudah berakhir.");
  const { error } = await ctx.supabase.from("guests").update({ checked_in_at: null, checked_in_pax: null, checked_in_by: null }).eq("id", guestId).eq("project_id", ctx.projectId);
  revalidatePath("/app/[projectId]/hari-h", "page");
  revalidatePath("/app/[projectId]/tamu-hadir", "page");
  revalidatePath("/app/[projectId]/tamu", "page");
  return error ? fail("Gagal membatalkan check-in.") : { ok: true, message: "Check-in dibatalkan." };
}
