"use server";

import { revalidatePath } from "next/cache";
import { scheduleCalendarSync } from "@/lib/google/schedule";
import { z } from "zod";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);

const Task = z.object({
  title: z.string().min(1, "Judul tugas wajib diisi").max(200),
  description: z.string().max(2000).nullable(),
  category: z.string().max(60).nullable(),
  phase_key: z.enum(["m12_plus", "m12_6", "m6_3", "m3_1", "m1", "w1", "hari_h", "pasca"]),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["todo", "in_progress", "done"]),
  assignee_id: z.string().uuid().nullable(),
  vendor_id: z.string().uuid().nullable(),
});

export async function saveTask(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, session } = await getProjectContext(projectId);
  const parsed = Task.safeParse({
    title: str(fd.get("title")) ?? "",
    description: str(fd.get("description")),
    category: str(fd.get("category")),
    phase_key: str(fd.get("phase_key")) ?? "m3_1",
    due_date: str(fd.get("due_date")),
    priority: str(fd.get("priority")) ?? "medium",
    status: str(fd.get("status")) ?? "todo",
    assignee_id: str(fd.get("assignee_id")),
    vendor_id: str(fd.get("vendor_id")),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  const id = str(fd.get("id"));
  const row = {
    ...parsed.data,
    project_id: projectId,
    completed_at: parsed.data.status === "done" ? new Date().toISOString() : null,
    completed_by: parsed.data.status === "done" ? session.user.id : null,
  };
  const { error } = id
    ? await supabase.from("tasks").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("tasks").insert({ ...row, created_by: session.user.id, sort_order: Date.now() % 1_000_000_000 });
  revalidatePath("/app/[projectId]", "layout");
  scheduleCalendarSync(projectId);
  return error ? dbError(error) : { ok: true, message: id ? "Tugas diperbarui." : "Tugas ditambahkan." };
}

export async function setTaskStatus(projectId: string, id: string, status: "todo" | "in_progress" | "done"): Promise<ActionResult> {
  const { supabase, session } = await getProjectContext(projectId);
  const { error } = await supabase.from("tasks").update({
    status,
    completed_at: status === "done" ? new Date().toISOString() : null,
    completed_by: status === "done" ? session.user.id : null,
  }).eq("id", id).eq("project_id", projectId);
  revalidatePath("/app/[projectId]", "layout");
  scheduleCalendarSync(projectId);
  return error ? dbError(error) : { ok: true };
}

export async function deleteTask(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("project_id", projectId);
  revalidatePath("/app/[projectId]", "layout");
  scheduleCalendarSync(projectId);
  return error ? dbError(error) : { ok: true, message: "Tugas dihapus." };
}

export async function moveTask(projectId: string, id: string, direction: "up" | "down"): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { data: task } = await supabase.from("tasks").select("id, phase_key, sort_order").eq("id", id).single();
  if (!task) return fail("Tugas tidak ditemukan.");
  const { data: neighbor } = await supabase.from("tasks").select("id, sort_order")
    .eq("project_id", projectId).eq("phase_key", task.phase_key)
    [direction === "up" ? "lt" : "gt"]("sort_order", task.sort_order)
    .order("sort_order", { ascending: direction === "down" }).limit(1).maybeSingle();
  if (!neighbor) return { ok: true };
  const r1 = await supabase.from("tasks").update({ sort_order: neighbor.sort_order }).eq("id", task.id);
  const r2 = await supabase.from("tasks").update({ sort_order: task.sort_order }).eq("id", neighbor.id);
  revalidatePath("/app/[projectId]/checklist", "page");
  return dbError(r1.error ?? r2.error);
}

export async function applyRecommendedChecklist(projectId: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.rpc("seed_project_defaults", { p_project_id: projectId });
  revalidatePath("/app/[projectId]", "layout");
  scheduleCalendarSync(projectId);
  return error ? dbError(error) : { ok: true, message: "Checklist rekomendasi ditambahkan." };
}
