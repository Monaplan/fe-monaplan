"use server";

import { revalidatePath } from "next/cache";
import { scheduleCalendarSync } from "@/lib/google/schedule";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { parseIDR, todayISO } from "@/lib/format";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
const KINDS = ["dp", "termin", "pelunasan", "lainnya"];

function done(projectId: string, error: { code?: string; message?: string } | null, message: string): ActionResult {
  revalidatePath("/app/[projectId]", "layout");
  scheduleCalendarSync(projectId);
  return error ? dbError(error) : { ok: true, message };
}

export async function saveCategory(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const name = str(fd.get("name"));
  if (!name) return fail("Nama kategori wajib diisi.");
  const id = str(fd.get("id"));
  const row = { project_id: projectId, name, allocated_idr: parseIDR(fd.get("allocated_idr")) };
  const { error } = id
    ? await supabase.from("budget_categories").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("budget_categories").insert({ ...row, sort_order: 100 });
  return done(projectId, error, "Kategori tersimpan.");
}

export async function deleteCategory(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("budget_categories").delete().eq("id", id).eq("project_id", projectId);
  return done(projectId, error, "Kategori dihapus.");
}

export async function saveItem(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const name = str(fd.get("name"));
  const categoryId = str(fd.get("category_id"));
  if (!name || !categoryId) return fail("Nama item dan kategori wajib diisi.");
  const id = str(fd.get("id"));
  const actualRaw = str(fd.get("actual_idr"));
  const row = {
    project_id: projectId,
    category_id: categoryId,
    name,
    estimated_idr: parseIDR(fd.get("estimated_idr")),
    actual_idr: actualRaw ? parseIDR(actualRaw) : null,
    vendor_id: str(fd.get("vendor_id")),
    notes: str(fd.get("notes")),
  };
  const { error } = id
    ? await supabase.from("budget_items").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("budget_items").insert(row);
  return done(projectId, error, "Item budget tersimpan.");
}

export async function deleteItem(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("budget_items").delete().eq("id", id).eq("project_id", projectId);
  return done(projectId, error, "Item dihapus.");
}

export async function savePayment(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, project } = await getProjectContext(projectId);
  const amount = parseIDR(fd.get("amount_idr"));
  if (amount <= 0) return fail("Nominal pembayaran wajib diisi.");
  const kind = str(fd.get("kind")) ?? "dp";
  if (!KINDS.includes(kind)) return fail("Jenis pembayaran tidak dikenal.");
  const status = fd.get("status") === "sudah_bayar" ? "sudah_bayar" : "belum_bayar";
  const id = str(fd.get("id"));
  const itemId = str(fd.get("budget_item_id"));
  let vendorId = str(fd.get("vendor_id"));
  if (itemId && !vendorId) {
    const { data } = await supabase.from("budget_items").select("vendor_id").eq("id", itemId).single();
    vendorId = data?.vendor_id ?? null;
  }
  const row = {
    project_id: projectId,
    budget_item_id: itemId,
    vendor_id: vendorId,
    kind,
    label: str(fd.get("label")),
    amount_idr: amount,
    due_date: str(fd.get("due_date")),
    status,
    paid_at: status === "sudah_bayar" ? (str(fd.get("paid_at")) ?? todayISO(project.timezone)) : null,
    payment_method: str(fd.get("payment_method")),
    proof_document_id: str(fd.get("proof_document_id")),
    notes: str(fd.get("notes")),
  };
  const { error } = id
    ? await supabase.from("expense_payments").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("expense_payments").insert(row);
  return done(projectId, error, "Pembayaran tersimpan.");
}

export async function markPaymentPaid(projectId: string, id: string): Promise<ActionResult> {
  const { supabase, project } = await getProjectContext(projectId);
  const { error } = await supabase.from("expense_payments")
    .update({ status: "sudah_bayar", paid_at: todayISO(project.timezone) })
    .eq("id", id).eq("project_id", projectId);
  return done(projectId, error, "Pembayaran ditandai lunas.");
}

export async function deletePayment(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("expense_payments").delete().eq("id", id).eq("project_id", projectId);
  return done(projectId, error, "Pembayaran dihapus.");
}
