"use server";

import { revalidatePath } from "next/cache";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { parseIDR, todayISO } from "@/lib/format";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
const PAGE = "/app/[projectId]/tabungan";

// Total di wedding_projects.savings_idr dijaga trigger database, jadi aksi ini cukup menulis setoran
function done(error: { code?: string; message?: string } | null, message: string): ActionResult {
  revalidatePath(PAGE, "page");
  revalidatePath("/app/[projectId]", "layout");
  return error ? dbError(error) : { ok: true, message };
}

export async function saveDeposit(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, session, project, canWrite } = await getProjectContext(projectId);
  if (!canWrite) return fail("Kamu tidak punya izin mengubah data ini, atau akses ruang kerja sudah berakhir.");
  const amount = parseIDR(fd.get("amount_idr"));
  if (amount <= 0) return fail("Isi nominal setoran lebih dari nol.");
  if (amount > 10_000_000_000) return fail("Nominal terlalu besar.");
  const on = str(fd.get("deposited_on"));
  const row = {
    project_id: projectId,
    amount_idr: amount,
    deposited_on: on && /^\d{4}-\d{2}-\d{2}$/.test(on) ? on : todayISO(project.timezone),
    note: str(fd.get("note"))?.slice(0, 300) ?? null,
  };
  const id = str(fd.get("id"));
  const { error } = id
    ? await supabase.from("savings_deposits").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("savings_deposits").insert({ ...row, recorded_by: session.user.id });
  return done(error, "Setoran tersimpan.");
}

export async function deleteDeposit(projectId: string, id: string): Promise<ActionResult> {
  const { supabase, canWrite } = await getProjectContext(projectId);
  if (!canWrite) return fail("Kamu tidak punya izin mengubah data ini, atau akses ruang kerja sudah berakhir.");
  const { error } = await supabase.from("savings_deposits").delete().eq("id", id).eq("project_id", projectId);
  return done(error, "Setoran dihapus.");
}
