"use server";

import { revalidatePath } from "next/cache";
import { getProjectContext } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { deleteObjects, isProjectKey, objectSize } from "@/lib/storage";
import { DEFAULT_QUOTA_MB, MAX_FILE_BYTES, MAX_FILE_MB } from "@/lib/limits";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
const CATS = ["identitas", "administrasi_nikah", "kontrak_vendor", "bukti_pembayaran", "lainnya"];
const MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// Kuota dihitung per pemilik: semua dokumen di semua proyek miliknya, termasuk yang diunggah kolaborator.
// Batasnya diambil dari paket aktif dengan kuota terbesar.
export async function getStorageUsage(projectId: string) {
  const { project } = await getProjectContext(projectId);
  const admin = createAdminClient();
  const [{ data: docs }, { data: lics }] = await Promise.all([
    admin.from("documents").select("size_bytes, wedding_projects!inner(owner_id)").eq("wedding_projects.owner_id", project.owner_id),
    admin.from("licenses").select("plans(storage_quota_mb)").eq("user_id", project.owner_id).eq("status", "active"),
  ]);
  const used = (docs ?? []).reduce((s, d) => s + Number(d.size_bytes), 0);
  const quotaMb = Math.max(0, ...(lics ?? []).map((l) => Number((l as any).plans?.storage_quota_mb ?? 0))) || DEFAULT_QUOTA_MB;
  return { used, quota: quotaMb * 1024 * 1024 };
}

export async function createDocument(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, session, project } = await getProjectContext(projectId);
  const path = str(fd.get("storage_path"));
  const size = Number(fd.get("size_bytes"));
  const mime = str(fd.get("mime_type"));
  if (!path || !isProjectKey(path, project, "documents")) return fail("Unggahan tidak valid.");
  if (!mime || !MIME.includes(mime)) return fail("Format file tidak didukung.");

  // Ukuran diambil dari objek yang benar-benar tersimpan, bukan dari klien
  const stored = await objectSize(path);
  if (stored == null) return fail("Berkas belum terunggah. Coba lagi, ya.");
  const realSize = stored || size;
  if (!(realSize > 0 && realSize <= MAX_FILE_BYTES)) {
    await deleteObjects([path]);
    return fail("Ukuran file maksimal {mb} MB.", { mb: MAX_FILE_MB });
  }

  const { used, quota } = await getStorageUsage(projectId);
  if (used + realSize > quota) {
    await deleteObjects([path]);
    return fail("Kuota penyimpanan kamu sudah penuh. Hapus beberapa dokumen dulu.");
  }

  const category = CATS.includes(String(fd.get("category"))) ? String(fd.get("category")) : "lainnya";
  const { data: doc, error } = await supabase.from("documents").insert({
    project_id: projectId,
    category,
    title: str(fd.get("title")) ?? str(fd.get("file_name")) ?? "Dokumen",
    storage_path: path,
    file_name: str(fd.get("file_name")) ?? "file",
    mime_type: mime,
    size_bytes: realSize,
    vendor_id: str(fd.get("vendor_id")),
    uploaded_by: session.user.id,
    notes: str(fd.get("notes")),
  }).select("id").single();
  if (error) {
    await deleteObjects([path]);
    return dbError(error);
  }

  const checklistId = str(fd.get("checklist_item_id"));
  if (checklistId) await supabase.from("document_checklist_items").update({ document_id: doc.id, is_done: true }).eq("id", checklistId).eq("project_id", projectId);
  const paymentId = str(fd.get("payment_id"));
  if (paymentId) await supabase.from("expense_payments").update({ proof_document_id: doc.id }).eq("id", paymentId).eq("project_id", projectId);

  revalidatePath("/app/[projectId]", "layout");
  return { ok: true, message: "Dokumen tersimpan." };
}

export async function updateDocument(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const id = str(fd.get("id"));
  if (!id) return fail("Dokumen tidak ditemukan.");
  const { error } = await supabase.from("documents").update({
    title: str(fd.get("title")) ?? "Dokumen",
    category: CATS.includes(String(fd.get("category"))) ? String(fd.get("category")) : "lainnya",
    vendor_id: str(fd.get("vendor_id")),
    notes: str(fd.get("notes")),
  }).eq("id", id).eq("project_id", projectId);
  revalidatePath("/app/[projectId]/dokumen", "page");
  return error ? dbError(error) : { ok: true, message: "Dokumen diperbarui." };
}

export async function deleteDocument(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { data } = await supabase.from("documents").select("storage_path").eq("id", id).single();
  const { error } = await supabase.from("documents").delete().eq("id", id).eq("project_id", projectId);
  if (!error && data) await deleteObjects([data.storage_path]);
  revalidatePath("/app/[projectId]", "layout");
  return error ? dbError(error) : { ok: true, message: "Dokumen dihapus." };
}

export async function toggleDocChecklist(projectId: string, id: string, done: boolean): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("document_checklist_items").update({ is_done: done }).eq("id", id).eq("project_id", projectId);
  revalidatePath("/app/[projectId]", "layout");
  return dbError(error);
}

export async function saveDocChecklistItem(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const name = str(fd.get("name"));
  if (!name) return fail("Nama dokumen wajib diisi.");
  const side = ["pria", "wanita", "bersama"].includes(String(fd.get("side"))) ? String(fd.get("side")) : "bersama";
  const id = str(fd.get("id"));
  const row = { project_id: projectId, name, side, notes: str(fd.get("notes")), document_id: str(fd.get("document_id")) };
  const { error } = id
    ? await supabase.from("document_checklist_items").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("document_checklist_items").insert({ ...row, sort_order: 100 });
  revalidatePath("/app/[projectId]", "layout");
  return error ? dbError(error) : { ok: true, message: "Checklist dokumen tersimpan." };
}

export async function deleteDocChecklistItem(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("document_checklist_items").delete().eq("id", id).eq("project_id", projectId);
  revalidatePath("/app/[projectId]", "layout");
  return error ? dbError(error) : { ok: true, message: "Item dihapus." };
}
