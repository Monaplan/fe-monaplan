"use server";

import { revalidatePath } from "next/cache";
import { scheduleCalendarSync } from "@/lib/google/schedule";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { localToISO } from "@/lib/format";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function saveAgenda(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, project, session } = await getProjectContext(projectId);
  const title = str(fd.get("title"));
  const date = str(fd.get("date"));
  if (!title || !date) return fail("Judul dan tanggal wajib diisi.");
  const allDay = fd.get("all_day") === "on";
  const startTime = allDay ? "00:00" : str(fd.get("start_time")) ?? "09:00";
  const endTime = allDay ? null : str(fd.get("end_time"));
  const startsAt = localToISO(date, startTime, project.timezone);
  const endsAt = endTime ? localToISO(date, endTime, project.timezone) : null;
  if (endsAt && endsAt <= startsAt) return fail("Jam selesai harus setelah jam mulai.");
  const offsets = fd.getAll("remind").map(Number).filter((n) => Number.isFinite(n) && n >= 0);

  const row = {
    project_id: projectId,
    title,
    description: str(fd.get("description")),
    location: str(fd.get("location")),
    starts_at: startsAt,
    ends_at: endsAt,
    all_day: allDay,
    remind_offsets_minutes: offsets,
  };
  const id = str(fd.get("id"));
  const { error } = id
    ? await supabase.from("agenda_items").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("agenda_items").insert({ ...row, created_by: session.user.id });
  revalidatePath("/app/[projectId]", "layout");
  scheduleCalendarSync(projectId);
  return error ? dbError(error) : { ok: true, message: "Agenda tersimpan." };
}

export async function deleteAgenda(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("agenda_items").delete().eq("id", id).eq("project_id", projectId);
  revalidatePath("/app/[projectId]", "layout");
  scheduleCalendarSync(projectId);
  return error ? dbError(error) : { ok: true, message: "Agenda dihapus." };
}
