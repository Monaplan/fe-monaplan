"use server";

import { revalidatePath } from "next/cache";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { parseIDR } from "@/lib/format";
import { GIFT_RECEIPT_KIND } from "@/lib/constants";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
const SIDES = ["pria", "wanita", "bersama"];
const KINDS: string[] = GIFT_RECEIPT_KIND.map((k) => k.key);
const PAGE = "/app/[projectId]/amplop-kado";

export async function saveReceipt(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, session } = await getProjectContext(projectId);
  const giver = str(fd.get("giver_name"));
  if (!giver) return fail("Nama pemberi wajib diisi.");
  if (giver.length > 120) return fail("Nama pemberi terlalu panjang.");
  const kind = KINDS.includes(String(fd.get("kind"))) ? String(fd.get("kind")) : "amplop";
  const side = SIDES.includes(String(fd.get("side"))) ? String(fd.get("side")) : "bersama";
  const amountRaw = str(fd.get("amount_idr"));
  const item = str(fd.get("item_name"));
  if (kind === "kado" && !item) return fail("Isi nama barang kadonya.");
  if (kind !== "kado" && !amountRaw) return fail("Isi nominalnya.");

  // Tamu yang dipilih harus milik proyek yang sama; bila tidak, catatan tetap disimpan tanpa tautan tamu
  let guestId = str(fd.get("guest_id"));
  if (guestId) {
    const { data: g } = await supabase.from("guests").select("id").eq("id", guestId).eq("project_id", projectId).maybeSingle();
    if (!g) guestId = null;
  }
  const receivedOn = str(fd.get("received_on"));
  const row = {
    project_id: projectId,
    guest_id: guestId,
    giver_name: giver,
    side,
    kind,
    amount_idr: kind === "kado" ? (amountRaw ? parseIDR(amountRaw) : null) : parseIDR(amountRaw),
    item_name: kind === "kado" ? item : null,
    received_on: receivedOn && /^\d{4}-\d{2}-\d{2}$/.test(receivedOn) ? receivedOn : undefined,
    notes: str(fd.get("notes"))?.slice(0, 500) ?? null,
  };

  const id = str(fd.get("id"));
  const { error } = id
    ? await supabase.from("gift_receipts").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("gift_receipts").insert({ ...row, recorded_by: session.user.id });
  revalidatePath(PAGE, "page");
  return error ? dbError(error) : { ok: true, message: "Catatan tersimpan." };
}

export async function setThanked(projectId: string, id: string, thanked: boolean): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("gift_receipts").update({ thanked_at: thanked ? new Date().toISOString() : null }).eq("id", id).eq("project_id", projectId);
  revalidatePath(PAGE, "page");
  return error ? dbError(error) : { ok: true };
}

export async function deleteReceipt(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("gift_receipts").delete().eq("id", id).eq("project_id", projectId);
  revalidatePath(PAGE, "page");
  return error ? dbError(error) : { ok: true, message: "Catatan dihapus." };
}
