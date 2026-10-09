"use server";

import { revalidatePath } from "next/cache";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
const TIME = /^\d{2}:\d{2}/;

const TEMPLATES: Record<string, [string, string, string, string][]> = {
  akad: [
    ["07:00", "07:45", "Persiapan dan rias pengantin", "MUA"],
    ["07:45", "08:00", "Kedatangan keluarga dan tamu", "Among tamu"],
    ["08:00", "08:15", "Pembukaan dan pembacaan ayat suci", "MC"],
    ["08:15", "08:45", "Prosesi akad nikah", "Penghulu"],
    ["08:45", "09:00", "Penyerahan mahar dan sungkeman", "Keluarga"],
    ["09:00", "09:30", "Doa, foto keluarga, dan ramah tamah", "Fotografer"],
  ],
  resepsi: [
    ["10:00", "10:45", "Persiapan venue dan briefing vendor", "WO"],
    ["11:00", "11:15", "Kirab dan kedatangan pengantin", "WO"],
    ["11:15", "11:30", "Sambutan keluarga", "MC"],
    ["11:30", "13:00", "Ramah tamah, hiburan, dan santap siang", "Katering"],
    ["11:30", "13:30", "Sesi foto bersama tamu", "Fotografer"],
    ["13:30", "14:00", "Penutupan dan foto keluarga besar", "MC"],
  ],
};

export async function saveRundownItem(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const title = str(fd.get("title"));
  const eventId = str(fd.get("event_id"));
  const start = str(fd.get("start_time"));
  const end = str(fd.get("end_time"));
  if (!title || !eventId || !start || !TIME.test(start)) return fail("Kegiatan dan jam mulai wajib diisi.");
  if (end && end <= start) return fail("Jam selesai harus setelah jam mulai.");
  const row = {
    project_id: projectId,
    event_id: eventId,
    start_time: start,
    end_time: end,
    title,
    description: str(fd.get("description")),
    pic_name: str(fd.get("pic_name")),
    location: str(fd.get("location")),
    vendor_id: str(fd.get("vendor_id")),
  };
  const id = str(fd.get("id"));
  const { error } = id
    ? await supabase.from("rundown_items").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("rundown_items").insert({ ...row, sort_order: Date.now() % 1_000_000_000 });
  revalidatePath(`/w/${projectId}/rundown`);
  return error ? dbError(error) : { ok: true, message: "Rundown tersimpan." };
}

export async function deleteRundownItem(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("rundown_items").delete().eq("id", id).eq("project_id", projectId);
  revalidatePath(`/w/${projectId}/rundown`);
  return error ? dbError(error) : { ok: true, message: "Item dihapus." };
}

export async function applyRundownTemplate(projectId: string, eventId: string, kind: "akad" | "resepsi"): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const rows = TEMPLATES[kind]!.map(([s, e, title, pic], i) => ({ project_id: projectId, event_id: eventId, start_time: s, end_time: e, title, pic_name: pic, sort_order: i }));
  const { error } = await supabase.from("rundown_items").insert(rows);
  revalidatePath(`/w/${projectId}/rundown`);
  return error ? dbError(error) : { ok: true, message: "Contoh rundown ditambahkan. Sesuaikan jam dan PIC-nya, ya." };
}

export async function swapRundownOrder(projectId: string, aId: string, bId: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { data } = await supabase.from("rundown_items").select("id, sort_order").in("id", [aId, bId]);
  const a = data?.find((x) => x.id === aId), b = data?.find((x) => x.id === bId);
  if (!a || !b) return fail("Item tidak ditemukan.");
  const so = a.sort_order === b.sort_order ? b.sort_order + 1 : b.sort_order;
  await supabase.from("rundown_items").update({ sort_order: so }).eq("id", a.id);
  const { error } = await supabase.from("rundown_items").update({ sort_order: a.sort_order }).eq("id", b.id);
  revalidatePath(`/w/${projectId}/rundown`);
  return dbError(error);
}
