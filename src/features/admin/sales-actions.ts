"use server";

import { revalidatePath } from "next/cache";
import { adminContext as ctx } from "./context";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { generateAccessCode } from "@/lib/codes";
import { parseIDR } from "@/lib/format";
import { normalizeWhatsapp } from "@/lib/support";
import { CHANNELS, EXPENSE_CATEGORIES, wibDate } from "@/lib/finance";

// ---------- Pembeli (penjualan di luar website) dan pengeluaran ----------
const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);

type Admin = Awaited<ReturnType<typeof ctx>>["admin"];
type Err = { code?: string; message?: string };

function refresh() {
  revalidatePath("/admin/pembeli");
  revalidatePath("/admin/keuangan");
  revalidatePath("/admin/kode", "layout");
  revalidatePath("/admin");
}

function saleDbError(error: Err): ActionResult {
  if (error.code === "23505") return fail("Nomor pesanan ini sudah tercatat di saluran yang sama.");
  // 42P01 = tabel belum ada: migrasi keuangan belum dijalankan
  if (error.code === "42P01" || /relation .*(sales|expenses)/i.test(error.message ?? "")) {
    return fail("Tabel keuangan belum ada. Jalankan migrasi 20261111000001_sales_finance.sql di Supabase SQL Editor.");
  }
  return dbError(error);
}

const isRealDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const today = () => wibDate(new Date().toISOString());

type Parsed = {
  buyer_name: string; buyer_email: string | null; buyer_phone: string | null; channel: (typeof CHANNELS)[number]; plan_id: string;
  gross_idr: number; fee_idr: number; sold_on: string; reference: string | null; notes: string | null;
};

function parseSale(fd: FormData): { ok: true; v: Parsed } | { ok: false; res: ActionResult } {
  const bad = (m: string) => ({ ok: false as const, res: fail(m) });
  const name = str(fd.get("buyer_name"));
  if (!name) return bad("Nama pembeli wajib diisi.");
  if (name.length > 120) return bad("Nama pembeli maksimal 120 karakter.");
  const email = str(fd.get("buyer_email"));
  if (email && (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return bad("Alamat email pembeli tidak valid.");
  const rawPhone = str(fd.get("buyer_phone"));
  const phone = rawPhone ? normalizeWhatsapp(rawPhone) : null;
  if (rawPhone && !phone) return bad("Nomor WhatsApp pembeli tidak valid. Contoh: 0812 3456 7890.");
  const channel = String(fd.get("channel") ?? "");
  if (!(CHANNELS as readonly string[]).includes(channel)) return bad("Saluran penjualan tidak valid.");
  const planId = str(fd.get("plan_id"));
  if (!planId || !/^[0-9a-f-]{36}$/i.test(planId)) return bad("Pilih paket yang dibeli.");
  const gross = parseIDR(fd.get("gross_idr")), fee = parseIDR(fd.get("fee_idr"));
  if (gross <= 0) return bad("Nominal yang dibayar harus lebih dari 0.");
  if (fee > gross) return bad("Potongan platform tidak boleh melebihi nominal yang dibayar.");
  const soldOn = str(fd.get("sold_on")) ?? today();
  if (!isRealDate(soldOn)) return bad("Tanggal transaksi tidak valid.");
  if (soldOn > today()) return bad("Tanggal transaksi tidak boleh di masa depan.");
  const reference = str(fd.get("reference"));
  if ((reference?.length ?? 0) > 80) return bad("Nomor pesanan maksimal 80 karakter.");
  const notes = str(fd.get("notes"));
  if ((notes?.length ?? 0) > 500) return bad("Catatan maksimal 500 karakter.");
  return { ok: true, v: { buyer_name: name, buyer_email: email, buyer_phone: phone, channel: channel as Parsed["channel"], plan_id: planId, gross_idr: gross, fee_idr: fee, sold_on: soldOn, reference, notes } };
}

// Kode akses sekali pakai untuk pembeli; ulangi bila bentrok dengan kode yang sudah ada
async function newCode(admin: Admin, planId: string): Promise<{ ok: true; id: string; code: string } | { ok: false; res: ActionResult }> {
  for (let i = 0; i < 5; i++) {
    const code = generateAccessCode();
    const { data, error } = await admin.from("access_codes").insert({ code, plan_id: planId, max_redemptions: 1 }).select("id, code").single();
    if (!error && data) return { ok: true, id: data.id as string, code: data.code as string };
    if (error?.code !== "23505") return { ok: false, res: dbError(error) };
  }
  return { ok: false, res: fail("Gagal membuat kode akses unik. Coba lagi.") };
}

export async function createSale(fd: FormData): Promise<ActionResult> {
  const { admin, audit, adminId } = await ctx();
  const p = parseSale(fd);
  if (!p.ok) return p.res;
  const v = p.v;
  const { data: plan } = await admin.from("plans").select("id").eq("id", v.plan_id).maybeSingle();
  if (!plan) return fail("Paket tidak ditemukan.");

  let code: { id: string; code: string } | null = null;
  if (fd.get("issue_code") === "on") {
    const c = await newCode(admin, v.plan_id);
    if (!c.ok) return c.res;
    code = c;
  }
  const { data: sale, error } = await admin.from("sales").insert({ ...v, access_code_id: code?.id ?? null, created_by: adminId }).select("id").single();
  if (error || !sale) {
    // Catatan gagal tersimpan: kode yang baru dibuat tidak boleh tertinggal tanpa pemilik
    if (code) await admin.from("access_codes").delete().eq("id", code.id);
    return saleDbError(error ?? {});
  }
  await audit("sale.create", "sale", sale.id as string, { buyer: v.buyer_name, channel: v.channel, gross: v.gross_idr, code: !!code });
  refresh();
  return { ok: true, message: code ? "Pembeli tercatat dan kode akses diterbitkan." : "Pembeli tercatat.", data: { id: sale.id, code: code?.code ?? null, name: v.buyer_name, phone: v.buyer_phone } };
}

export async function updateSale(fd: FormData): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const id = str(fd.get("id"));
  if (!id) return fail("Pembeli tidak ditemukan.");
  const p = parseSale(fd);
  if (!p.ok) return p.res;
  const v = p.v;
  const { data: sale } = await admin.from("sales").select("id, status, plan_id, access_code_id, access_codes(status)").eq("id", id).maybeSingle();
  if (!sale) return fail("Pembeli tidak ditemukan.");
  if (sale.status === "refunded") return fail("Penjualan yang sudah di-refund tidak bisa diubah.");

  if (sale.plan_id !== v.plan_id && sale.access_code_id) {
    const codeStatus = (sale.access_codes as unknown as { status: string } | null)?.status;
    if (codeStatus !== "available") return fail("Kode akses sudah ditebus atau dicabut, jadi paketnya tidak bisa diganti.");
    const { error: ce } = await admin.from("access_codes").update({ plan_id: v.plan_id }).eq("id", sale.access_code_id);
    if (ce) return dbError(ce);
  }
  const { error } = await admin.from("sales").update({ ...v, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return saleDbError(error);
  await audit("sale.update", "sale", id, { buyer: v.buyer_name, channel: v.channel, gross: v.gross_idr });
  refresh();
  return { ok: true, message: "Perubahan tersimpan." };
}

// Terbitkan kode untuk pembeli yang dicatat tanpa kode
export async function issueSaleCode(saleId: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { data: sale } = await admin.from("sales").select("id, status, plan_id, access_code_id, buyer_name, buyer_phone").eq("id", saleId).maybeSingle();
  if (!sale) return fail("Pembeli tidak ditemukan.");
  if (sale.status !== "paid") return fail("Penjualan ini sudah di-refund, kode tidak bisa diterbitkan.");
  if (sale.access_code_id) return fail("Pembeli ini sudah punya kode akses.");
  if (!sale.plan_id) return fail("Pilih paket pembeli ini dulu lewat Ubah.");
  const c = await newCode(admin, sale.plan_id as string);
  if (!c.ok) return c.res;
  // Hanya pasang bila belum ada kode (dua klik berurutan tidak boleh menimpa kode yang sudah dikirim)
  const { data: set, error } = await admin.from("sales").update({ access_code_id: c.id, updated_at: new Date().toISOString() }).eq("id", saleId).is("access_code_id", null).select("id");
  if (error || !set?.length) {
    await admin.from("access_codes").delete().eq("id", c.id);
    return error ? saleDbError(error) : fail("Pembeli ini sudah punya kode akses.");
  }
  await audit("sale.issue_code", "sale", saleId, { buyer: sale.buyer_name });
  refresh();
  return { ok: true, message: "Kode akses diterbitkan.", data: { id: saleId, code: c.code, name: sale.buyer_name, phone: sale.buyer_phone } };
}

// Refund: pemasukan dikeluarkan dari laporan, kode yang belum dipakai dicabut, dan lisensi dari kode itu dicabut bila sudah dipakai
export async function refundSale(saleId: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { data: sale } = await admin.from("sales").select("id, status, access_code_id, access_codes(status)").eq("id", saleId).maybeSingle();
  if (!sale) return fail("Pembeli tidak ditemukan.");
  if (sale.status === "refunded") return fail("Penjualan ini sudah di-refund.");
  const now = new Date().toISOString();
  const { error } = await admin.from("sales").update({ status: "refunded", refunded_at: now, updated_at: now }).eq("id", saleId).eq("status", "paid");
  if (error) return saleDbError(error);

  let note = "Penjualan di-refund.";
  if (sale.access_code_id) {
    const codeStatus = (sale.access_codes as unknown as { status: string } | null)?.status;
    if (codeStatus === "available") {
      await admin.from("access_codes").update({ status: "revoked", revoked_at: now, revoked_reason: "Refund penjualan" }).eq("id", sale.access_code_id).eq("status", "available");
      note = "Penjualan di-refund dan kode akses dicabut.";
    } else if (codeStatus === "redeemed") {
      const { data: lic } = await admin.from("licenses").update({ status: "revoked", revoked_at: now, revoked_reason: "Refund penjualan" }).eq("access_code_id", sale.access_code_id).eq("status", "active").select("id");
      note = lic?.length ? "Penjualan di-refund dan akses pembeli dicabut." : "Penjualan di-refund. Kode sudah ditebus, cek menu Lisensi bila akses perlu dicabut.";
    }
  }
  await audit("sale.refund", "sale", saleId);
  refresh();
  return { ok: true, message: note };
}

export async function deleteSale(saleId: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { data: sale } = await admin.from("sales").select("id, buyer_name, access_code_id, access_codes(status, redemption_count)").eq("id", saleId).maybeSingle();
  if (!sale) return fail("Pembeli tidak ditemukan.");
  const code = sale.access_codes as unknown as { status: string; redemption_count: number } | null;
  if (code && (code.status === "redeemed" || code.redemption_count > 0)) {
    return fail("Kode akses pembeli ini sudah ditebus, jadi catatannya tidak bisa dihapus. Pakai Refund bila uangnya dikembalikan.");
  }
  const { error } = await admin.from("sales").delete().eq("id", saleId);
  if (error) return saleDbError(error);
  // Kode yang belum pernah dipakai ikut dihapus supaya tidak jadi kode yatim yang masih bisa ditebus
  if (sale.access_code_id) await admin.from("access_codes").delete().eq("id", sale.access_code_id).eq("redemption_count", 0);
  await audit("sale.delete", "sale", saleId, { buyer: sale.buyer_name });
  refresh();
  return { ok: true, message: "Catatan pembeli dihapus." };
}

export async function saveExpense(fd: FormData): Promise<ActionResult> {
  const { admin, audit, adminId } = await ctx();
  const description = str(fd.get("description"));
  if (!description) return fail("Uraian pengeluaran wajib diisi.");
  if (description.length > 200) return fail("Uraian maksimal 200 karakter.");
  const category = String(fd.get("category") ?? "");
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) return fail("Kategori pengeluaran tidak valid.");
  const amount = parseIDR(fd.get("amount_idr"));
  if (amount <= 0) return fail("Jumlah pengeluaran harus lebih dari 0.");
  const spentOn = str(fd.get("spent_on")) ?? today();
  if (!isRealDate(spentOn)) return fail("Tanggal pengeluaran tidak valid.");
  if (spentOn > today()) return fail("Tanggal pengeluaran tidak boleh di masa depan.");
  const { data, error } = await admin.from("expenses").insert({ spent_on: spentOn, category, description, amount_idr: amount, created_by: adminId }).select("id").single();
  if (error || !data) return saleDbError(error ?? {});
  await audit("expense.create", "expense", data.id as string, { category, amount });
  refresh();
  return { ok: true, message: "Pengeluaran tercatat." };
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { data, error } = await admin.from("expenses").delete().eq("id", expenseId).select("id, description, amount_idr");
  if (error) return saleDbError(error);
  if (!data?.length) return fail("Pengeluaran tidak ditemukan.");
  await audit("expense.delete", "expense", expenseId, { description: data[0]!.description, amount: data[0]!.amount_idr });
  refresh();
  return { ok: true, message: "Pengeluaran dihapus." };
}
