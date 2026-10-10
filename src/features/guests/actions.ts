"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProjectContext } from "@/lib/access";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { normalizePhone } from "@/lib/format";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
const SIDES = ["pria", "wanita", "bersama"] as const;
const CATS = ["vip", "keluarga", "reguler"] as const;

function done(projectId: string, error: { code?: string; message?: string } | null, message: string, data?: any): ActionResult {
  revalidatePath("/app/[projectId]", "layout");
  return error ? dbError(error) : { ok: true, message, data };
}

async function ensureGroup(supabase: any, projectId: string, name: string | null, side: string): Promise<string | null> {
  if (!name) return null;
  const { data: existing } = await supabase.from("guest_groups").select("id").eq("project_id", projectId).eq("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data } = await supabase.from("guest_groups").insert({ project_id: projectId, name, side }).select("id").single();
  return data?.id ?? null;
}

export async function saveGuest(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const name = str(fd.get("name"));
  if (!name) return fail("Nama tamu wajib diisi.");
  const phoneRaw = str(fd.get("phone"));
  const phone = normalizePhone(phoneRaw);
  if (phoneRaw && !phone) return fail("Nomor WhatsApp belum valid.");
  const side = z.enum(SIDES).catch("bersama").parse(str(fd.get("side")));
  const id = str(fd.get("id"));

  if (phone) {
    let q = supabase.from("guests").select("id, name").eq("project_id", projectId).eq("phone_e164", phone);
    if (id) q = q.neq("id", id);
    const { data: dup } = await q.limit(1).maybeSingle();
    if (dup && fd.get("allow_duplicate") !== "on") return fail('Nomor ini sudah dipakai tamu "{name}". Centang "tetap simpan" bila memang berbeda orang.', { name: dup.name });
  }

  const newGroup = str(fd.get("new_group"));
  const groupId = newGroup ? await ensureGroup(supabase, projectId, newGroup, side) : str(fd.get("group_id"));
  const pax = Math.min(20, Math.max(1, Number(fd.get("pax_invited") ?? 1) || 1));
  const row = {
    project_id: projectId,
    name,
    phone_raw: phoneRaw,
    phone_e164: phone,
    side,
    category: z.enum(CATS).catch("reguler").parse(str(fd.get("category"))),
    group_id: groupId,
    pax_invited: pax,
    notes: str(fd.get("notes")),
  };
  const res = id
    ? await supabase.from("guests").update(row).eq("id", id).eq("project_id", projectId).select("id, pax_confirmed").single()
    : await supabase.from("guests").insert(row).select("id, pax_confirmed").single();
  if (res.error) {
    if (res.error.code === "23514") return fail("Kuota pax tidak boleh lebih kecil dari jumlah yang sudah dikonfirmasi tamu.");
    return dbError(res.error);
  }

  const events = fd.getAll("events").map(String);
  await supabase.from("guest_event_invites").delete().eq("guest_id", res.data.id);
  if (events.length) {
    await supabase.from("guest_event_invites").insert(events.map((e) => ({ guest_id: res.data.id, event_id: e, project_id: projectId })));
  }
  return done(projectId, null, id ? "Data tamu diperbarui." : "Tamu ditambahkan.");
}

export async function deleteGuests(projectId: string, ids: string[]): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("guests").delete().eq("project_id", projectId).in("id", ids);
  return done(projectId, error, `${ids.length} tamu dihapus.`);
}

export async function setGuestsGroup(projectId: string, ids: string[], groupId: string | null): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("guests").update({ group_id: groupId }).eq("project_id", projectId).in("id", ids);
  return done(projectId, error, "Grup tamu diperbarui.");
}

export async function markInvitationSent(projectId: string, ids: string[], sent = true): Promise<ActionResult> {
  const { supabase, session } = await getProjectContext(projectId);
  const { error } = await supabase.from("guests")
    .update(sent ? { invitation_sent_at: new Date().toISOString(), invitation_sent_by: session.user.id } : { invitation_sent_at: null, invitation_sent_by: null })
    .eq("project_id", projectId).in("id", ids);
  revalidatePath("/app/[projectId]/tamu", "page");
  return error ? dbError(error) : { ok: true, message: sent ? (ids.length > 1 ? `${ids.length} tamu ditandai terkirim.` : undefined) : "Tanda terkirim dihapus." };
}


const ImportRow = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().max(30).nullable(),
  side: z.string().nullable(),
  group: z.string().max(80).nullable(),
  category: z.string().nullable(),
  pax: z.number().int().min(1).max(20),
});

export async function importGuests(projectId: string, rows: unknown, skipDuplicates: boolean): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const parsed = z.array(ImportRow).max(2000).safeParse(rows);
  if (!parsed.success) return fail("Format data impor belum sesuai.");

  const [{ data: existing }, { data: events }, { data: groups }] = await Promise.all([
    supabase.from("guests").select("phone_e164").eq("project_id", projectId).not("phone_e164", "is", null),
    supabase.from("wedding_events").select("id").eq("project_id", projectId),
    supabase.from("guest_groups").select("id, name").eq("project_id", projectId),
  ]);
  const seen = new Set((existing ?? []).map((g) => g.phone_e164));
  const groupMap = new Map((groups ?? []).map((g) => [g.name.toLowerCase(), g.id]));

  const toInsert = [];
  let duplicates = 0;
  for (const r of parsed.data) {
    const phone = normalizePhone(r.phone);
    if (phone && seen.has(phone)) {
      duplicates++;
      if (skipDuplicates) continue;
    }
    if (phone) seen.add(phone);
    const side = (SIDES as readonly string[]).includes(r.side?.toLowerCase() ?? "") ? r.side!.toLowerCase() : "bersama";
    let groupId: string | null = null;
    if (r.group) {
      const key = r.group.toLowerCase();
      if (!groupMap.has(key)) {
        const { data } = await supabase.from("guest_groups").insert({ project_id: projectId, name: r.group, side }).select("id").single();
        if (data) groupMap.set(key, data.id);
      }
      groupId = groupMap.get(key) ?? null;
    }
    const cat = r.category?.toLowerCase();
    toInsert.push({
      project_id: projectId, name: r.name, phone_raw: r.phone, phone_e164: phone, side, group_id: groupId,
      category: cat === "vip" || cat === "keluarga" ? cat : "reguler", pax_invited: r.pax,
    });
  }

  for (let i = 0; i < toInsert.length; i += 500) {
    const { data: inserted, error } = await supabase.from("guests").insert(toInsert.slice(i, i + 500)).select("id");
    if (error) return dbError(error);
    if (events?.length && inserted?.length) {
      await supabase.from("guest_event_invites").insert(inserted.flatMap((g) => events.map((e) => ({ guest_id: g.id, event_id: e.id, project_id: projectId }))));
    }
  }
  return done(projectId, null, `${toInsert.length} tamu diimpor${duplicates ? `, ${duplicates} nomor duplikat ${skipDuplicates ? "dilewati" : "tetap disimpan"}` : ""}.`);
}

export async function saveTemplate(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const body = str(fd.get("body"));
  if (!body) return fail("Isi pesan wajib diisi.");
  if (!body.includes("{link_rsvp}")) return fail("Template wajib memuat {link_rsvp} agar tamu bisa konfirmasi.");
  const id = str(fd.get("id"));
  const row = { project_id: projectId, name: str(fd.get("name")) ?? "Undangan", body, is_default: true };
  const { error } = id
    ? await supabase.from("message_templates").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("message_templates").insert(row);
  return done(projectId, error, "Template pesan tersimpan.");
}

export async function deleteGroup(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("guest_groups").delete().eq("id", id).eq("project_id", projectId);
  return done(projectId, error, "Grup dihapus.");
}
