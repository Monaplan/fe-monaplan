"use server";

import { revalidatePath } from "next/cache";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { deleteObjects, isProjectKey } from "@/lib/storage";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
const INSPIRATION_CATEGORIES = ["dekorasi", "busana", "bunga", "venue", "makeup", "katering", "lainnya"] as const;

const PATH = "/app/[projectId]/rona-impian";

// Tabel baru dibuat migrasi 8; bila belum dijalankan, beri petunjuk yang jelas
function missing(error: { message?: string; code?: string }): ActionResult | null {
  if (error.code === "42P01" || /inspiration_items/.test(error.message ?? "")) return fail("Tabel Rona Impian belum ada. Jalankan migrasi 20261009000008_inspiration_trip.sql di Supabase.");
  return null;
}

export async function saveInspiration(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, project, canWrite } = await getProjectContext(projectId);
  if (!canWrite) return fail("Kamu tidak punya izin mengubah ini.");
  const title = str(fd.get("title"));
  if (!title) return fail("Judul wajib diisi.");
  if (title.length > 120) return fail("Judul maksimal 120 karakter.");
  const category = String(fd.get("category") ?? "lainnya");
  if (!(INSPIRATION_CATEGORIES as readonly string[]).includes(category)) return fail("Kategori tidak dikenal.");
  const note = str(fd.get("note"));
  if (note && note.length > 500) return fail("Catatan maksimal 500 karakter.");
  const link = str(fd.get("link_url"));
  if (link && (!/^https?:\/\//i.test(link) || link.length > 500)) return fail("Tautan harus diawali http:// atau https://.");
  const colorRaw = str(fd.get("color"));
  const color = colorRaw && /^#[0-9A-Fa-f]{6}$/.test(colorRaw) ? colorRaw.toUpperCase() : null;
  if (colorRaw && !color) return fail("Warna tidak valid.");
  const imagePath = str(fd.get("image_path"));
  if (imagePath && !isProjectKey(imagePath, project, "inspiration")) return fail("Lokasi foto tidak valid.");

  const id = str(fd.get("id"));
  const row: Record<string, unknown> = { project_id: projectId, title, category, note, link_url: link, color, is_favorite: fd.get("is_favorite") === "on" };
  if (imagePath) row.image_path = imagePath;
  if (fd.get("remove_image") === "on") row.image_path = null;

  let oldImage: string | null = null;
  if (id && "image_path" in row) {
    const { data: prev } = await supabase.from("inspiration_items").select("image_path").eq("id", id).eq("project_id", projectId).maybeSingle();
    oldImage = prev?.image_path ?? null;
  }
  const { error } = id
    ? await supabase.from("inspiration_items").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("inspiration_items").insert(row);
  if (error) return missing(error) ?? dbError(error);
  if (oldImage && oldImage !== row.image_path) await deleteObjects([oldImage]);
  revalidatePath(PATH, "page");
  return { ok: true, message: "Ide tersimpan." };
}

export async function toggleInspirationFavorite(projectId: string, id: string, value: boolean): Promise<ActionResult> {
  const { supabase, canWrite } = await getProjectContext(projectId);
  if (!canWrite) return fail("Kamu tidak punya izin mengubah ini.");
  const { error } = await supabase.from("inspiration_items").update({ is_favorite: value }).eq("id", id).eq("project_id", projectId);
  revalidatePath(PATH, "page");
  return error ? dbError(error) : { ok: true };
}

export async function deleteInspiration(projectId: string, id: string): Promise<ActionResult> {
  const { supabase, canWrite } = await getProjectContext(projectId);
  if (!canWrite) return fail("Kamu tidak punya izin mengubah ini.");
  const { data } = await supabase.from("inspiration_items").select("image_path").eq("id", id).eq("project_id", projectId).maybeSingle();
  const { error } = await supabase.from("inspiration_items").delete().eq("id", id).eq("project_id", projectId);
  if (error) return dbError(error);
  if (data?.image_path) await deleteObjects([data.image_path]);
  revalidatePath(PATH, "page");
  return { ok: true, message: "Ide dihapus." };
}
