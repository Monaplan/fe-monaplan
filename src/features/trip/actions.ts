"use server";

import { revalidatePath } from "next/cache";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { parseIDR } from "@/lib/format";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
const TRIP_KINDS = ["akomodasi", "transport", "kegiatan", "makan", "lainnya"] as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const PATH = "/app/[projectId]/honeymoon-planner";

function missing(error: { message?: string; code?: string }): ActionResult | null {
  if (error.code === "42P01" || /trip_(plans|items)/.test(error.message ?? "")) return fail("Tabel Honeymoon Planner belum ada. Jalankan migrasi 20261009000008_inspiration_trip.sql di Supabase.");
  return null;
}

export async function saveTripPlan(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, canWrite } = await getProjectContext(projectId);
  if (!canWrite) return fail("Kamu tidak punya izin mengubah ini.");
  const start = str(fd.get("start_date")), end = str(fd.get("end_date"));
  if ((start && !DATE.test(start)) || (end && !DATE.test(end))) return fail("Tanggal tidak valid.");
  if (start && end && end < start) return fail("Tanggal pulang harus sama atau setelah tanggal berangkat.");
  const destination = str(fd.get("destination"));
  if (destination && destination.length > 120) return fail("Tujuan maksimal 120 karakter.");
  const notes = str(fd.get("notes"));
  if (notes && notes.length > 1000) return fail("Catatan maksimal 1000 karakter.");
  const budget = parseIDR(fd.get("budget_idr"));
  if (!Number.isFinite(budget) || budget < 0) return fail("Anggaran tidak valid.");
  const { error } = await supabase.from("trip_plans").upsert({ project_id: projectId, destination, start_date: start, end_date: end, budget_idr: budget, notes }, { onConflict: "project_id" });
  if (error) return missing(error) ?? dbError(error);
  revalidatePath(PATH, "page");
  return { ok: true, message: "Rencana perjalanan tersimpan." };
}

export async function saveTripItem(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, canWrite } = await getProjectContext(projectId);
  if (!canWrite) return fail("Kamu tidak punya izin mengubah ini.");
  const title = str(fd.get("title"));
  if (!title) return fail("Judul wajib diisi.");
  if (title.length > 120) return fail("Judul maksimal 120 karakter.");
  const kind = String(fd.get("kind") ?? "kegiatan");
  if (!(TRIP_KINDS as readonly string[]).includes(kind)) return fail("Jenis tidak dikenal.");
  const day = str(fd.get("day_date")), time = str(fd.get("start_time"));
  if ((day && !DATE.test(day)) || (time && !TIME.test(time))) return fail("Tanggal atau jam tidak valid.");
  const location = str(fd.get("location")), notes = str(fd.get("notes"));
  if ((location?.length ?? 0) > 160 || (notes?.length ?? 0) > 500) return fail("Teks terlalu panjang.");
  const cost = parseIDR(fd.get("cost_idr"));
  if (!Number.isFinite(cost) || cost < 0) return fail("Biaya tidak valid.");
  const id = str(fd.get("id"));
  const row = { project_id: projectId, title, kind, day_date: day, start_time: time, location, notes, cost_idr: cost, is_booked: fd.get("is_booked") === "on" };
  const { error } = id
    ? await supabase.from("trip_items").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("trip_items").insert(row);
  if (error) return missing(error) ?? dbError(error);
  revalidatePath(PATH, "page");
  return { ok: true, message: "Butir rencana tersimpan." };
}

export async function setTripItemBooked(projectId: string, id: string, value: boolean): Promise<ActionResult> {
  const { supabase, canWrite } = await getProjectContext(projectId);
  if (!canWrite) return fail("Kamu tidak punya izin mengubah ini.");
  const { error } = await supabase.from("trip_items").update({ is_booked: value }).eq("id", id).eq("project_id", projectId);
  revalidatePath(PATH, "page");
  return error ? dbError(error) : { ok: true };
}

export async function deleteTripItem(projectId: string, id: string): Promise<ActionResult> {
  const { supabase, canWrite } = await getProjectContext(projectId);
  if (!canWrite) return fail("Kamu tidak punya izin mengubah ini.");
  const { error } = await supabase.from("trip_items").delete().eq("id", id).eq("project_id", projectId);
  revalidatePath(PATH, "page");
  return error ? dbError(error) : { ok: true, message: "Butir dihapus." };
}
