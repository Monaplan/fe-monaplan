"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminContext as ctx } from "./context";
import { dbError, fail, okm, type ActionResult } from "@/lib/result";
import { generateAccessCode } from "@/lib/codes";
import { parseIDR } from "@/lib/format";
import { getPaymentProvider } from "@/lib/payments/midtrans";
import { applyProviderStatus } from "@/lib/payments/process";
import { deletePrefix, storagePrefix } from "@/lib/storage";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);

// ---------- Paket (ADM-02) ----------
export async function savePlan(fd: FormData): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const type = fd.get("type") === "lifetime" ? "lifetime" : "timed";
  const row = {
    code: str(fd.get("code"))?.toUpperCase(),
    name: str(fd.get("name")),
    description: str(fd.get("description")),
    type,
    duration_days: type === "timed" ? Number(fd.get("duration_days")) || null : null,
    price_idr: parseIDR(fd.get("price_idr")),
    max_projects: Number(fd.get("max_projects")) || 1,
    max_collaborators: Number(fd.get("max_collaborators") ?? 3),
    storage_quota_mb: Number(fd.get("storage_quota_mb")) || 50,
    is_public: fd.get("is_public") === "on",
    is_active: fd.get("is_active") === "on",
    sort_order: Number(fd.get("sort_order")) || 0,
    tier: Math.max(0, Math.floor(Number(fd.get("tier") ?? 1))) || (fd.get("code") === "TRIAL" ? 0 : 1),
  };
  if (!row.code || !row.name) return fail("Kode dan nama paket wajib diisi.");
  if (type === "timed" && !row.duration_days) return fail("Durasi wajib diisi untuk paket bermasa aktif.");
  const id = str(fd.get("id"));
  const res = id ? await admin.from("plans").update(row).eq("id", id).select("id").single() : await admin.from("plans").insert(row).select("id").single();
  if (res.error) return dbError(res.error);
  await audit(id ? "plan.update" : "plan.create", "plan", res.data.id, row);
  revalidatePath("/admin/paket");
  return { ok: true, message: "Paket tersimpan." };
}

// ---------- Kode akses (ADM-03) ----------
export async function createBatch(fd: FormData): Promise<ActionResult> {
  const { admin, audit, adminId } = await ctx();
  const parsed = z.object({
    name: z.string().min(1).max(120),
    channel: z.enum(["reseller", "promo", "bonus", "offline", "kompensasi"]),
    plan_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(10000),
    max_redemptions_per_code: z.number().int().min(1).max(10000),
    valid_until: z.string().nullable(),
    notes: z.string().nullable(),
  }).safeParse({
    name: str(fd.get("name")) ?? "",
    channel: str(fd.get("channel")) ?? "promo",
    plan_id: str(fd.get("plan_id")) ?? "",
    quantity: Number(fd.get("quantity")),
    max_redemptions_per_code: Number(fd.get("max_redemptions_per_code") ?? 1),
    valid_until: str(fd.get("valid_until")),
    notes: str(fd.get("notes")),
  });
  if (!parsed.success) return fail("Isian batch belum lengkap atau jumlah melebihi 10.000.");
  const d = parsed.data;
  const validUntil = d.valid_until ? new Date(`${d.valid_until}T23:59:59+07:00`).toISOString() : null;

  const { data: batch, error } = await admin.from("access_code_batches").insert({ ...d, valid_until: validUntil, created_by: adminId }).select("id").single();
  if (error) return dbError(error);

  // Insert per 1.000 baris, ulangi kode yang bentrok
  let remaining = d.quantity;
  let guard = 0;
  while (remaining > 0 && guard++ < 50) {
    const n = Math.min(1000, remaining);
    const codes = new Set<string>();
    while (codes.size < n) codes.add(generateAccessCode());
    const rows = [...codes].map((code) => ({ code, batch_id: batch.id, plan_id: d.plan_id, max_redemptions: d.max_redemptions_per_code, valid_until: validUntil }));
    const { data: inserted, error: e } = await admin.from("access_codes").upsert(rows, { onConflict: "code", ignoreDuplicates: true }).select("id");
    if (e) return dbError(e);
    remaining -= inserted?.length ?? 0;
  }
  await audit("batch.create", "access_code_batch", batch.id, { name: d.name, quantity: d.quantity, plan_id: d.plan_id });
  revalidatePath("/admin/kode");
  return okm("{n} kode dibuat.", { n: d.quantity }, { id: batch.id });
}

export async function revokeCode(codeId: string, reason: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { error } = await admin.from("access_codes").update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_reason: reason }).eq("id", codeId);
  if (error) return dbError(error);
  await audit("code.revoke", "access_code", codeId, { reason });
  revalidatePath("/admin/kode", "layout");
  return { ok: true, message: "Kode dicabut." };
}

export async function revokeBatch(batchId: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const now = new Date().toISOString();
  await admin.from("access_code_batches").update({ revoked_at: now }).eq("id", batchId);
  const { error } = await admin.from("access_codes").update({ status: "revoked", revoked_at: now, revoked_reason: "Batch dicabut" }).eq("batch_id", batchId).eq("status", "available");
  if (error) return dbError(error);
  await audit("batch.revoke", "access_code_batch", batchId);
  revalidatePath("/admin/kode", "layout");
  return { ok: true, message: "Semua kode yang belum terpakai di batch ini dicabut." };
}

// ---------- Order (ADM-04) ----------
export async function recheckOrder(orderId: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single();
  if (!order) return fail("Order tidak ditemukan.");
  try {
    const status = await getPaymentProvider().getStatus(order.order_number);
    if (!status.transactionStatus) return fail("Transaksi belum ada di Midtrans (user belum memilih metode bayar).");
    const res = await applyProviderStatus(admin, order, status);
    await audit("order.recheck", "order", orderId, { transaction_status: status.transactionStatus });
    revalidatePath("/admin/order");
    return okm(res.granted ? "Status Midtrans: {status}, lisensi diterbitkan." : "Status Midtrans: {status}.", { status: status.transactionStatus });
  } catch (e) {
    return fail("Gagal cek status: {error}", { error: (e as Error).message });
  }
}

export async function setOrderReviewed(orderId: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { error } = await admin.from("orders").update({ needs_review: false }).eq("id", orderId);
  await audit("order.reviewed", "order", orderId);
  revalidatePath("/admin/order");
  return error ? dbError(error) : { ok: true, message: "Order ditandai sudah ditinjau." };
}

// ---------- Lisensi (ADM-05) ----------
export async function grantLicense(fd: FormData): Promise<ActionResult> {
  const { admin, audit, adminId } = await ctx();
  const email = str(fd.get("email"))?.toLowerCase();
  const planId = str(fd.get("plan_id"));
  if (!email || !planId) return fail("Email dan paket wajib diisi.");
  const { data: user } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!user) return fail("Pengguna dengan email ini belum pernah login.");
  const { data, error } = await admin.rpc("issue_license", { p_user_id: user.id, p_plan_id: planId, p_source: "admin_grant", p_granted_by: adminId });
  if (error) return fail(error.message.includes("ALREADY_LIFETIME") ? "Pengguna sudah punya akses selamanya." : error.message);
  await audit("license.grant", "license", (data as any).id, { email, plan_id: planId, reason: str(fd.get("reason")) });
  revalidatePath("/admin/lisensi");
  return { ok: true, message: "Lisensi diberikan." };
}

export async function extendLicense(licenseId: string, days: number): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  if (!(days > 0 && days <= 3650)) return fail("Jumlah hari tidak valid.");
  const { data: lic } = await admin.from("licenses").select("ends_at").eq("id", licenseId).single();
  if (!lic?.ends_at) return fail("Lisensi selamanya tidak perlu diperpanjang.");
  const base = Math.max(Date.parse(lic.ends_at), Date.now());
  const { error } = await admin.from("licenses").update({ ends_at: new Date(base + days * 86_400_000).toISOString() }).eq("id", licenseId);
  if (error) return dbError(error);
  await audit("license.extend", "license", licenseId, { days });
  revalidatePath("/admin/lisensi");
  return okm("Diperpanjang {days} hari.", { days });
}

export async function revokeLicense(licenseId: string, reason: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  if (!reason.trim()) return fail("Alasan wajib diisi.");
  const { error } = await admin.from("licenses").update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_reason: reason }).eq("id", licenseId);
  if (error) return dbError(error);
  await audit("license.revoke", "license", licenseId, { reason });
  revalidatePath("/admin/lisensi");
  return { ok: true, message: "Lisensi dicabut." };
}

export async function restoreLicense(licenseId: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { error } = await admin.from("licenses").update({ status: "active", revoked_at: null, revoked_reason: null }).eq("id", licenseId);
  if (error) return dbError(error);
  await audit("license.restore", "license", licenseId);
  revalidatePath("/admin/lisensi");
  return { ok: true, message: "Lisensi dipulihkan." };
}

// ---------- Pengguna (hapus akun) ----------
// Menghapus akun auth beserta profil, lisensi, dan proyek miliknya (cascade), serta berkasnya di storage.
// Order tetap tersimpan untuk pembukuan (user_id menjadi null). Keanggotaan sebagai kolaborator di proyek orang lain ikut hilang.
export async function deleteUserAccount(userId: string, confirmEmail: string): Promise<ActionResult> {
  const { admin, audit, adminId } = await ctx();
  if (userId === adminId) return fail("Kamu tidak bisa menghapus akunmu sendiri dari panel admin.");

  const { data: target } = await admin.from("profiles").select("id, email, full_name, role").eq("id", userId).maybeSingle();
  if (!target) return fail("Pengguna tidak ditemukan.");
  if (confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()) return fail("Email konfirmasi tidak sama.");
  if (target.role === "admin") {
    const { count } = await admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return fail("Tidak bisa menghapus admin terakhir.");
  }

  const [{ data: projects }, { count: licenses }, { count: orders }] = await Promise.all([
    admin.from("wedding_projects").select("*").eq("owner_id", userId),
    admin.from("licenses").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("orders").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  // Catat dulu sebelum profil hilang, agar jejak tetap ada walau penghapusan gagal di tengah
  await audit("user.delete", "user", userId, {
    email: target.email, name: target.full_name, role: target.role,
    projects: (projects ?? []).map((p) => p.title), licenses: licenses ?? 0, orders_kept: orders ?? 0,
  });

  for (const p of projects ?? []) await deletePrefix(`${storagePrefix(p)}/`).catch(() => {});
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return fail("Gagal menghapus akun: {error}", { error: error.message });

  revalidatePath("/admin", "layout");
  return okm("Akun {email} dihapus.", { email: target.email });
}
