"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";

// Tautan panitia hanya diatur pemilik ruang kerja (PRD 21.4)
async function ownerContext(projectId: string) {
  const ctx = await getProjectContext(projectId);
  return ctx.isOwner && ctx.canWrite ? ctx : null;
}

const newToken = () => randomBytes(18).toString("base64url");

// Membuat (atau membuat ulang) tautan: token lama langsung tidak berlaku
export async function rotateStaffLink(projectId: string): Promise<ActionResult> {
  const ctx = await ownerContext(projectId);
  if (!ctx) return fail("Hanya pemilik ruang kerja yang bisa mengatur tautan panitia.");
  const token = newToken();
  const { error } = await ctx.supabase.from("wedding_projects").update({ staff_token: token }).eq("id", projectId);
  revalidatePath("/app/[projectId]/pengaturan", "page");
  return error ? dbError(error) : { ok: true, message: "Tautan panitia siap dibagikan.", data: { token } };
}

export async function disableStaffLink(projectId: string): Promise<ActionResult> {
  const ctx = await ownerContext(projectId);
  if (!ctx) return fail("Hanya pemilik ruang kerja yang bisa mengatur tautan panitia.");
  const { error } = await ctx.supabase.from("wedding_projects").update({ staff_token: null }).eq("id", projectId);
  revalidatePath("/app/[projectId]/pengaturan", "page");
  return error ? dbError(error) : { ok: true, message: "Tautan panitia dimatikan." };
}

export async function setStaffCanRecordGifts(projectId: string, allowed: boolean): Promise<ActionResult> {
  const ctx = await ownerContext(projectId);
  if (!ctx) return fail("Hanya pemilik ruang kerja yang bisa mengatur tautan panitia.");
  const { error } = await ctx.supabase.from("wedding_projects").update({ staff_can_record_gifts: allowed }).eq("id", projectId);
  revalidatePath("/app/[projectId]/pengaturan", "page");
  return error ? dbError(error) : { ok: true, message: allowed ? "Panitia sekarang bisa mencatat amplop." : "Panitia tidak bisa mencatat amplop." };
}
