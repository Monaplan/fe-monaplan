"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { parseIDR } from "@/lib/format";
import { adminContext as ctx } from "./context";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);

// ---------- Konfigurasi: trial dan promo ----------
async function writeSetting(key: "trial" | "promo", value: Record<string, unknown>, adminId: string) {
  return createAdminClient().from("app_settings").upsert({ key, value, updated_by: adminId, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

function missingTable(error: { code?: string; message?: string }): ActionResult | null {
  // 42P01 = tabel belum ada: migrasi 4 belum dijalankan
  if (error.code === "42P01" || /app_settings|promos/.test(error.message ?? "")) {
    return fail("Tabel konfigurasi belum ada. Jalankan migrasi 20261009000004_trial_promo_calendar.sql di Supabase terlebih dahulu.");
  }
  return null;
}

export async function saveTrialSettings(fd: FormData): Promise<ActionResult> {
  const { audit, adminId } = await ctx();
  const days = Number(fd.get("days"));
  if (!Number.isInteger(days) || days < 1 || days > 90) return fail("Lama trial harus 1 sampai 90 hari.");
  const value = { enabled: fd.get("enabled") === "on", days };
  const { error } = await writeSetting("trial", value, adminId);
  if (error) return missingTable(error) ?? dbError(error);
  await audit("settings.trial", "app_settings", "trial", value);
  revalidatePath("/", "layout");
  return { ok: true, message: value.enabled ? `Trial ${days} hari aktif.` : "Trial dimatikan." };
}

export async function setFeatureEnabled(key: "trial" | "promo", enabled: boolean): Promise<ActionResult> {
  const { admin, audit, adminId } = await ctx();
  const { data } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
  const base = (data?.value as Record<string, unknown> | undefined) ?? (key === "trial" ? { days: 3 } : {});
  const value = { ...base, enabled };
  const { error } = await writeSetting(key, value, adminId);
  if (error) return missingTable(error) ?? dbError(error);
  await audit(`settings.${key}`, "app_settings", key, value);
  revalidatePath("/", "layout");
  return { ok: true, message: `${key === "trial" ? "Trial" : "Promo"} ${enabled ? "diaktifkan" : "dimatikan"}.` };
}

export async function savePromo(fd: FormData): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const type = fd.get("discount_type") === "fixed" ? "fixed" : "percent";
  const value = type === "fixed" ? parseIDR(fd.get("discount_value")) : Number(fd.get("discount_value"));
  const name = str(fd.get("name"));
  if (!name) return fail("Nama promo wajib diisi.");
  if (!Number.isFinite(value) || value <= 0) return fail("Nilai diskon harus lebih dari 0.");
  if (type === "percent" && (value > 100 || !Number.isInteger(value))) return fail("Diskon persen berupa bilangan bulat 1 sampai 100.");
  const startsAt = str(fd.get("starts_at")), endsAt = str(fd.get("ends_at"));
  const row = {
    name,
    description: str(fd.get("description")),
    plan_id: str(fd.get("plan_id")),
    discount_type: type,
    discount_value: value,
    starts_at: startsAt ? new Date(`${startsAt}T00:00:00+07:00`).toISOString() : null,
    ends_at: endsAt ? new Date(`${endsAt}T23:59:59+07:00`).toISOString() : null,
    is_active: fd.get("is_active") === "on",
  };
  if (row.starts_at && row.ends_at && row.ends_at <= row.starts_at) return fail("Tanggal berakhir harus setelah tanggal mulai.");
  const id = str(fd.get("id"));
  const res = id
    ? await admin.from("promos").update(row).eq("id", id).select("id").single()
    : await admin.from("promos").insert(row).select("id").single();
  if (res.error) return missingTable(res.error) ?? dbError(res.error);
  await audit(id ? "promo.update" : "promo.create", "promo", res.data.id, row);
  revalidatePath("/admin/promo");
  revalidatePath("/", "layout");
  return { ok: true, message: "Promo tersimpan." };
}

export async function setPromoActive(promoId: string, active: boolean): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { error } = await admin.from("promos").update({ is_active: active }).eq("id", promoId);
  if (error) return dbError(error);
  await audit("promo.toggle", "promo", promoId, { active });
  revalidatePath("/admin/promo");
  revalidatePath("/", "layout");
  return { ok: true, message: active ? "Promo diaktifkan." : "Promo dimatikan." };
}

export async function deletePromo(promoId: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { error } = await admin.from("promos").delete().eq("id", promoId);
  if (error) return dbError(error);
  await audit("promo.delete", "promo", promoId);
  revalidatePath("/admin/promo");
  revalidatePath("/", "layout");
  return { ok: true, message: "Promo dihapus. Order lama tetap mencatat potongannya." };
}

// ---------- Pengguna: peran dan akses ----------
export async function setUserRole(userId: string, role: "user" | "admin"): Promise<ActionResult> {
  const { admin, audit, adminId } = await ctx();
  if (role !== "user" && role !== "admin") return fail("Peran tidak valid.");
  if (userId === adminId) return fail("Kamu tidak bisa mengubah perananmu sendiri. Minta admin lain melakukannya.");
  const { data: target } = await admin.from("profiles").select("email, role").eq("id", userId).maybeSingle();
  if (!target) return fail("Pengguna tidak ditemukan.");
  if (target.role === role) return { ok: true, message: "Peran tidak berubah." };
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return dbError(error);
  await audit("user.role", "user", userId, { email: target.email, from: target.role, to: role });
  revalidatePath("/admin/pengguna");
  return { ok: true, message: `${target.email} sekarang ${role === "admin" ? "admin" : "pengguna biasa"}.` };
}

// Akses diatur per pengguna: beri selamanya, beri trial, cabut semua, atau pulihkan yang dicabut
export type UserAccessOp =
  | { op: "lifetime" }
  | { op: "trial"; days: number }
  | { op: "revoke"; reason: string }
  | { op: "restore" };

export async function setUserAccess(userId: string, input: UserAccessOp): Promise<ActionResult> {
  const { admin, audit, adminId } = await ctx();
  const { data: target } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  if (!target) return fail("Pengguna tidak ditemukan.");
  const now = new Date().toISOString();

  if (input.op === "lifetime") {
    const { data: plan } = await admin.from("plans").select("id").eq("type", "lifetime").eq("is_active", true).order("sort_order").limit(1).maybeSingle();
    if (!plan) return fail("Belum ada paket selamanya yang aktif.");
    const { data, error } = await admin.rpc("issue_license", { p_user_id: userId, p_plan_id: plan.id, p_source: "admin_grant", p_granted_by: adminId });
    if (error) return fail(error.message.includes("ALREADY_LIFETIME") ? "Pengguna ini sudah punya akses selamanya." : error.message);
    await audit("access.lifetime", "user", userId, { email: target.email, license_id: (data as { id: string }).id });
    revalidatePath("/admin", "layout");
    return { ok: true, message: `${target.email} mendapat akses selamanya.` };
  }

  if (input.op === "trial") {
    const days = Math.floor(Number(input.days));
    if (!(days >= 1 && days <= 365)) return fail("Lama trial harus 1 sampai 365 hari.");
    const { data: plan } = await admin.from("plans").select("id").eq("code", "TRIAL").maybeSingle();
    if (!plan) return fail("Paket TRIAL belum ada. Jalankan migrasi 20261009000004 di Supabase.");
    const { data: forever } = await admin.from("licenses").select("id").eq("user_id", userId).eq("status", "active").is("ends_at", null).limit(1);
    if (forever?.length) return fail("Pengguna ini sudah punya akses selamanya, trial tidak diperlukan.");
    const { error } = await admin.from("licenses").insert({
      user_id: userId, plan_id: plan.id, source: "trial", granted_by: adminId,
      starts_at: now, ends_at: new Date(Date.now() + days * 86_400_000).toISOString(),
    });
    if (error) return dbError(error);
    await audit("access.trial", "user", userId, { email: target.email, days });
    revalidatePath("/admin", "layout");
    return { ok: true, message: `${target.email} mendapat trial ${days} hari.` };
  }

  if (input.op === "revoke") {
    const reason = input.reason.trim();
    if (!reason) return fail("Alasan wajib diisi.");
    const { data, error } = await admin.from("licenses")
      .update({ status: "revoked", revoked_at: now, revoked_reason: reason })
      .eq("user_id", userId).eq("status", "active").select("id");
    if (error) return dbError(error);
    if (!data?.length) return fail("Pengguna ini tidak punya akses aktif untuk dicabut.");
    await audit("access.revoke", "user", userId, { email: target.email, reason, licenses: data.length });
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Akses ${target.email} dicabut.` };
  }

  const { data, error } = await admin.from("licenses")
    .update({ status: "active", revoked_at: null, revoked_reason: null })
    .eq("user_id", userId).eq("status", "revoked").select("id");
  if (error) return dbError(error);
  if (!data?.length) return fail("Tidak ada akses yang dicabut untuk dipulihkan.");
  await audit("access.restore", "user", userId, { email: target.email, licenses: data.length });
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Akses ${target.email} dipulihkan.` };
}
