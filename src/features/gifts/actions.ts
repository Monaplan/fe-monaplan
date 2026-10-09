"use server";

import { revalidatePath } from "next/cache";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { parseIDR } from "@/lib/format";
import { deleteObjects, isProjectKey } from "@/lib/storage";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
const STATUS = ["rencana", "dipesan", "dibeli", "diterima"];

export async function saveGift(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const name = str(fd.get("name"));
  if (!name) return fail("Nama item wajib diisi.");
  const type = fd.get("type") === "seserahan" ? "seserahan" : "mahar";
  const status = STATUS.includes(String(fd.get("status"))) ? String(fd.get("status")) : "rencana";
  const est = str(fd.get("estimated_price_idr"));
  const act = str(fd.get("actual_price_idr"));
  const imagePath = str(fd.get("image_path"));
  if (imagePath && !isProjectKey(imagePath, projectId, "gifts")) return fail("Lokasi foto tidak valid.");

  const id = str(fd.get("id"));
  const row: Record<string, unknown> = {
    project_id: projectId,
    type,
    name,
    category: str(fd.get("category")),
    quantity: Math.max(1, Number(fd.get("quantity") ?? 1) || 1),
    estimated_price_idr: est ? parseIDR(est) : null,
    actual_price_idr: act ? parseIDR(act) : null,
    purchase_url: str(fd.get("purchase_url")),
    store_name: str(fd.get("store_name")),
    status,
    notes: str(fd.get("notes")),
  };
  if (imagePath) row.image_path = imagePath;
  if (fd.get("remove_image") === "on") row.image_path = null;

  // MHR-04: hubungkan ke budget kategori "Mahar & Seserahan"
  if (fd.get("link_budget") === "on") {
    const { data: cat } = await supabase.from("budget_categories").select("id").eq("project_id", projectId).eq("name", "Mahar & Seserahan").maybeSingle();
    if (cat) {
      const qty = row.quantity as number;
      const budgetRow = {
        project_id: projectId, category_id: cat.id, name: `${type === "mahar" ? "Mahar" : "Seserahan"}: ${name}`,
        estimated_idr: ((row.estimated_price_idr as number | null) ?? 0) * qty,
        actual_idr: row.actual_price_idr != null ? (row.actual_price_idr as number) * qty : null,
      };
      const existingId = str(fd.get("budget_item_id"));
      if (existingId) {
        await supabase.from("budget_items").update(budgetRow).eq("id", existingId);
        row.budget_item_id = existingId;
      } else {
        const { data: bi } = await supabase.from("budget_items").insert(budgetRow).select("id").single();
        row.budget_item_id = bi?.id ?? null;
      }
    }
  }

  let oldImage: string | null = null;
  if (id && "image_path" in row) {
    const { data: prev } = await supabase.from("gift_items").select("image_path").eq("id", id).single();
    oldImage = prev?.image_path ?? null;
  }
  const { error } = id
    ? await supabase.from("gift_items").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("gift_items").insert(row);
  if (!error && oldImage && oldImage !== row.image_path) await deleteObjects([oldImage]);
  revalidatePath(`/w/${projectId}`, "layout");
  return error ? dbError(error) : { ok: true, message: "Item tersimpan." };
}

export async function setGiftStatus(projectId: string, id: string, status: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  if (!STATUS.includes(status)) return fail("Status tidak dikenal.");
  const { error } = await supabase.from("gift_items").update({ status }).eq("id", id).eq("project_id", projectId);
  revalidatePath(`/w/${projectId}/mahar-seserahan`);
  return error ? dbError(error) : { ok: true };
}

export async function deleteGift(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { data } = await supabase.from("gift_items").select("image_path").eq("id", id).single();
  const { error } = await supabase.from("gift_items").delete().eq("id", id).eq("project_id", projectId);
  if (!error && data?.image_path) await deleteObjects([data.image_path]);
  revalidatePath(`/w/${projectId}/mahar-seserahan`);
  return error ? dbError(error) : { ok: true, message: "Item dihapus." };
}
