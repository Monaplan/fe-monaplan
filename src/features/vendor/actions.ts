"use server";

import { revalidatePath } from "next/cache";
import { scheduleCalendarSync } from "@/lib/google/schedule";
import { z } from "zod";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { normalizePhone, parseIDR, todayISO } from "@/lib/format";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
const STATUSES = ["prospek", "survei", "negosiasi", "deal", "batal"] as const;

function done(projectId: string, error: { code?: string; message?: string } | null, message: string, data?: any): ActionResult {
  revalidatePath("/app/[projectId]", "layout");
  return error ? dbError(error) : { ok: true, message, data };
}

export async function saveVendor(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const name = str(fd.get("name"));
  const category = str(fd.get("category"));
  if (!name || !category) return fail("Nama dan kategori vendor wajib diisi.");
  const phoneRaw = str(fd.get("phone"));
  const phone = normalizePhone(phoneRaw);
  if (phoneRaw && !phone) return fail("Nomor WhatsApp belum valid.");
  const status = z.enum(STATUSES).catch("prospek").parse(str(fd.get("status")));
  const rating = Number(fd.get("rating") ?? 0);
  const row = {
    project_id: projectId,
    name,
    category,
    contact_person: str(fd.get("contact_person")),
    phone_e164: phone,
    email: str(fd.get("email")),
    instagram: str(fd.get("instagram"))?.replace(/^@/, "") ?? null,
    website: str(fd.get("website")),
    address: str(fd.get("address")),
    notes: str(fd.get("notes")),
    status,
    rating: rating >= 1 && rating <= 5 ? rating : null,
  };
  const id = str(fd.get("id"));
  const res = id
    ? await supabase.from("vendors").update(row).eq("id", id).eq("project_id", projectId).select("id").single()
    : await supabase.from("vendors").insert(row).select("id").single();
  return done(projectId, res.error, "Vendor tersimpan.", { id: res.data?.id });
}

export async function setVendorStatus(projectId: string, id: string, status: (typeof STATUSES)[number]): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("vendors").update({ status }).eq("id", id).eq("project_id", projectId);
  return done(projectId, error, "Status vendor diperbarui.");
}

export async function deleteVendor(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("vendors").delete().eq("id", id).eq("project_id", projectId);
  return done(projectId, error, "Vendor dihapus.");
}

export async function savePackage(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const name = str(fd.get("name"));
  const vendorId = str(fd.get("vendor_id"));
  if (!name || !vendorId) return fail("Nama paket wajib diisi.");
  const row = {
    project_id: projectId,
    vendor_id: vendorId,
    name,
    price_idr: parseIDR(fd.get("price_idr")),
    description: str(fd.get("description")),
    inclusions: str(fd.get("inclusions")),
  };
  const id = str(fd.get("id"));
  const { error } = id
    ? await supabase.from("vendor_packages").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("vendor_packages").insert(row);
  return done(projectId, error, "Paket tersimpan.");
}

export async function deletePackage(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("vendor_packages").delete().eq("id", id).eq("project_id", projectId);
  return done(projectId, error, "Paket dihapus.");
}

// VND-04: tandai deal, tawarkan membuat item budget serta jadwal DP dan pelunasan
export async function markVendorDeal(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, project } = await getProjectContext(projectId);
  const vendorId = str(fd.get("vendor_id"));
  if (!vendorId) return fail("Vendor tidak ditemukan.");
  const amount = parseIDR(fd.get("deal_amount_idr"));
  if (amount <= 0) return fail("Nilai deal wajib diisi.");
  const packageId = str(fd.get("selected_package_id"));
  const dealDate = str(fd.get("deal_date")) ?? todayISO(project.timezone);

  const { data: vendor, error } = await supabase.from("vendors")
    .update({ status: "deal", deal_amount_idr: amount, deal_date: dealDate, selected_package_id: packageId })
    .eq("id", vendorId).eq("project_id", projectId).select("name, category").single();
  if (error) return dbError(error);

  if (fd.get("create_budget") === "on") {
    const categoryId = str(fd.get("category_id"));
    if (!categoryId) return fail("Pilih kategori budget.");
    const { data: existing } = await supabase.from("budget_items").select("id").eq("project_id", projectId).eq("vendor_id", vendorId).maybeSingle();
    let itemId = existing?.id as string | undefined;
    if (itemId) {
      await supabase.from("budget_items").update({ actual_idr: amount, category_id: categoryId }).eq("id", itemId);
    } else {
      const { data: item, error: e2 } = await supabase.from("budget_items")
        .insert({ project_id: projectId, category_id: categoryId, vendor_id: vendorId, name: vendor.name, estimated_idr: amount, actual_idr: amount })
        .select("id").single();
      if (e2) return dbError(e2);
      itemId = item.id;
    }
    const dp = parseIDR(fd.get("dp_amount_idr"));
    const payments = [];
    if (dp > 0) {
      payments.push({ project_id: projectId, budget_item_id: itemId, vendor_id: vendorId, kind: "dp", label: `DP ${vendor.name}`, amount_idr: dp, due_date: str(fd.get("dp_due_date")) });
    }
    if (amount - dp > 0) {
      payments.push({ project_id: projectId, budget_item_id: itemId, vendor_id: vendorId, kind: "pelunasan", label: `Pelunasan ${vendor.name}`, amount_idr: amount - dp, due_date: str(fd.get("final_due_date")) });
    }
    if (payments.length) {
      const { error: e3 } = await supabase.from("expense_payments").insert(payments);
      if (e3) return dbError(e3);
    }
  }
  scheduleCalendarSync(projectId);
  return done(projectId, null, `${vendor.name} ditandai deal.`);
}
