"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { scheduleCalendarSync } from "@/lib/google/schedule";
import { z } from "zod";
import { getMyAccess, getProjectContext, isActive, requireUser } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { addDaysISO, diffDays, localToISO, parseIDR } from "@/lib/format";
import { appUrl, EVENT_TYPES } from "@/lib/constants";
import { emailButton, emailLayout, sendEmail } from "@/lib/email";
import { deleteObjects, deletePrefix, isProjectKey } from "@/lib/storage";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);

const Onboarding = z.object({
  partner_one_name: z.string().min(1, "Nama mempelai pria wajib diisi").max(100),
  partner_two_name: z.string().min(1, "Nama mempelai wanita wajib diisi").max(100),
  partner_one_nickname: z.string().max(40).nullable(),
  partner_two_nickname: z.string().max(40).nullable(),
  wedding_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  city: z.string().max(80).nullable(),
  timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]),
  total_budget_idr: z.number().int().min(0),
  guest_target: z.number().int().min(0).nullable(),
});

export async function createProject(fd: FormData): Promise<ActionResult> {
  const { user } = await requireUser();
  if (!isActive(await getMyAccess())) return fail("Aktifkan akses terlebih dulu.");

  const parsed = Onboarding.safeParse({
    partner_one_name: str(fd.get("partner_one_name")) ?? "",
    partner_two_name: str(fd.get("partner_two_name")) ?? "",
    partner_one_nickname: str(fd.get("partner_one_nickname")),
    partner_two_nickname: str(fd.get("partner_two_nickname")),
    wedding_date: str(fd.get("wedding_date")),
    city: str(fd.get("city")),
    timezone: str(fd.get("timezone")) ?? "Asia/Jakarta",
    total_budget_idr: parseIDR(fd.get("total_budget_idr")),
    guest_target: str(fd.get("guest_target")) ? Number(fd.get("guest_target")) : null,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  const d = parsed.data;

  const supabase = await createClient();
  const id = randomUUID();
  const n1 = d.partner_one_nickname ?? d.partner_one_name.split(" ")[0];
  const n2 = d.partner_two_nickname ?? d.partner_two_name.split(" ")[0];
  const { error } = await supabase.from("wedding_projects").insert({
    id,
    owner_id: user.id,
    title: `${n1} & ${n2}`,
    ...d,
    rsvp_deadline: d.wedding_date ? addDaysISO(d.wedding_date, -3) : null,
  });
  if (error) {
    if (error.message.includes("PROJECT_LIMIT_REACHED")) return fail("Batas jumlah proyek untuk paketmu sudah tercapai.");
    return dbError(error);
  }

  if (d.wedding_date) {
    await supabase.from("wedding_events").insert([
      { project_id: id, type: "akad", name: "Akad Nikah", starts_at: localToISO(d.wedding_date, "08:00", d.timezone), ends_at: localToISO(d.wedding_date, "10:00", d.timezone), sort_order: 1 },
      { project_id: id, type: "resepsi", name: "Resepsi", starts_at: localToISO(d.wedding_date, "11:00", d.timezone), ends_at: localToISO(d.wedding_date, "14:00", d.timezone), sort_order: 2 },
    ]);
  }
  const { error: seedErr } = await supabase.rpc("seed_project_defaults", { p_project_id: id });
  if (seedErr) return dbError(seedErr);
  await supabase.from("profiles").update({ last_active_project_id: id }).eq("id", user.id);
  return { ok: true, data: { id } };
}

// ---------- Pengaturan Pernikahan ----------

export async function updateCouple(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const p1 = str(fd.get("partner_one_name"));
  const p2 = str(fd.get("partner_two_name"));
  if (!p1 || !p2) return fail("Nama kedua mempelai wajib diisi.");
  const { error } = await supabase.from("wedding_projects").update({
    partner_one_name: p1,
    partner_two_name: p2,
    partner_one_nickname: str(fd.get("partner_one_nickname")),
    partner_two_nickname: str(fd.get("partner_two_nickname")),
    title: str(fd.get("title")) ?? `${p1} & ${p2}`,
  }).eq("id", projectId);
  revalidatePath(`/w/${projectId}`, "layout");
  return error ? dbError(error) : { ok: true, message: "Data pasangan tersimpan." };
}

export async function updateWeddingInfo(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, project } = await getProjectContext(projectId);
  const newDate = str(fd.get("wedding_date"));
  const tz = str(fd.get("timezone")) ?? "Asia/Jakarta";
  const shift = fd.get("shift_tasks") === "on";
  const { error } = await supabase.from("wedding_projects").update({
    wedding_date: newDate,
    city: str(fd.get("city")),
    timezone: tz,
    total_budget_idr: parseIDR(fd.get("total_budget_idr")),
    guest_target: str(fd.get("guest_target")) ? Number(fd.get("guest_target")) : null,
    rsvp_deadline: str(fd.get("rsvp_deadline")),
  }).eq("id", projectId);
  if (error) return dbError(error);

  // Geser due date tugas dari template yang belum selesai
  if (shift && newDate && project.wedding_date && newDate !== project.wedding_date) {
    const delta = diffDays(project.wedding_date, newDate);
    const { data: tasks } = await supabase.from("tasks").select("id, due_date")
      .eq("project_id", projectId).eq("is_from_template", true).neq("status", "done").not("due_date", "is", null);
    await Promise.all((tasks ?? []).map((t) => supabase.from("tasks").update({ due_date: addDaysISO(t.due_date, delta) }).eq("id", t.id)));
  } else if (shift && newDate && !project.wedding_date) {
    const { data: tasks } = await supabase.from("tasks").select("id, checklist_templates(offset_days)")
      .eq("project_id", projectId).eq("is_from_template", true).neq("status", "done");
    await Promise.all((tasks ?? []).map((t: any) => t.checklist_templates &&
      supabase.from("tasks").update({ due_date: addDaysISO(newDate, -t.checklist_templates.offset_days) }).eq("id", t.id)));
  }
  revalidatePath(`/w/${projectId}`, "layout");
  return { ok: true, message: "Informasi pernikahan tersimpan." };
}

export async function saveEvent(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, project } = await getProjectContext(projectId);
  const id = str(fd.get("id"));
  const type = str(fd.get("type")) ?? "lainnya";
  const date = str(fd.get("date"));
  const tz = project.timezone;
  const row = {
    project_id: projectId,
    type,
    name: str(fd.get("name")) ?? EVENT_TYPES.find((e) => e.key === type)?.label ?? "Acara",
    starts_at: date ? localToISO(date, str(fd.get("start_time")), tz) : null,
    ends_at: date && str(fd.get("end_time")) ? localToISO(date, str(fd.get("end_time")), tz) : null,
    venue_name: str(fd.get("venue_name")),
    venue_address: str(fd.get("venue_address")),
    maps_url: str(fd.get("maps_url")),
    dress_code: str(fd.get("dress_code")),
    notes: str(fd.get("notes")),
    sort_order: Number(fd.get("sort_order") ?? 0) || 0,
  };
  if (row.starts_at && row.ends_at && row.ends_at <= row.starts_at) return fail("Jam selesai harus setelah jam mulai.");
  const { error } = id
    ? await supabase.from("wedding_events").update(row).eq("id", id).eq("project_id", projectId)
    : await supabase.from("wedding_events").insert(row);
  revalidatePath(`/w/${projectId}`, "layout");
  scheduleCalendarSync(projectId);
  return error ? dbError(error) : { ok: true, message: "Acara tersimpan." };
}

export async function deleteEvent(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("wedding_events").delete().eq("id", id).eq("project_id", projectId);
  revalidatePath(`/w/${projectId}`, "layout");
  scheduleCalendarSync(projectId);
  return error ? dbError(error) : { ok: true, message: "Acara dihapus." };
}

export async function updateCover(projectId: string, path: string | null): Promise<ActionResult> {
  const { supabase, project } = await getProjectContext(projectId);
  if (path && !isProjectKey(path, projectId, "cover")) return fail("Lokasi foto tidak valid.");
  const { error } = await supabase.from("wedding_projects").update({ cover_image_path: path }).eq("id", projectId);
  if (!error && project.cover_image_path && project.cover_image_path !== path) {
    await deleteObjects([project.cover_image_path]);
  }
  revalidatePath(`/w/${projectId}/pengaturan`);
  return error ? dbError(error) : { ok: true, message: path ? "Foto sampul diperbarui." : "Foto sampul dihapus." };
}

// ---------- Kolaborator ----------

export async function inviteCollaborator(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, project, isOwner, session } = await getProjectContext(projectId);
  if (!isOwner) return fail("Hanya pemilik yang bisa mengundang kolaborator.");
  const email = z.string().email().safeParse(str(fd.get("email"))?.toLowerCase());
  if (!email.success) return fail("Email belum valid.");
  const role = fd.get("role") === "viewer" ? "viewer" : "editor";

  const admin = createAdminClient();
  const { data: lic } = await admin.from("licenses").select("plans(max_collaborators)")
    .eq("user_id", project.owner_id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const max = (lic as any)?.plans?.max_collaborators ?? 3;
  const [{ count: members }, { count: pending }] = await Promise.all([
    supabase.from("project_members").select("*", { count: "exact", head: true }).eq("project_id", projectId).neq("role", "owner"),
    supabase.from("project_invitations").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "pending").gt("expires_at", new Date().toISOString()),
  ]);
  if ((members ?? 0) + (pending ?? 0) >= max) return fail(`Kuota kolaborator (${max} orang) sudah penuh.`);

  const { data: inv, error } = await supabase.from("project_invitations")
    .insert({ project_id: projectId, email: email.data, role, invited_by: session.user.id })
    .select("token").single();
  if (error) return dbError(error);

  const link = `${appUrl()}/gabung/${inv.token}`;
  await sendEmail(email.data, `Undangan merencanakan pernikahan ${project.title}`, emailLayout(
    `Kamu diundang ke ruang kerja ${project.title}`,
    `<p>${session.profile?.full_name ?? "Pemilik ruang kerja"} mengajakmu ikut merencanakan pernikahan di Monaplan sebagai <b>${role === "editor" ? "Editor" : "Viewer"}</b>.</p>
     <p>Masuk dengan akun Google yang memakai email ini. Undangan berlaku 7 hari.</p>${emailButton(link, "Terima Undangan")}`,
  ));
  revalidatePath(`/w/${projectId}/pengaturan`);
  return { ok: true, message: "Undangan dibuat. Link juga bisa kamu salin dan kirim sendiri.", data: { link } };
}

export async function revokeInvitation(projectId: string, id: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("project_invitations").update({ status: "revoked" }).eq("id", id).eq("project_id", projectId);
  revalidatePath(`/w/${projectId}/pengaturan`);
  return error ? dbError(error) : { ok: true, message: "Undangan dibatalkan." };
}

export async function updateMemberRole(projectId: string, userId: string, role: "editor" | "viewer"): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("project_members").update({ role }).eq("project_id", projectId).eq("user_id", userId);
  revalidatePath(`/w/${projectId}/pengaturan`);
  return error ? dbError(error) : { ok: true, message: "Peran diperbarui." };
}

export async function removeMember(projectId: string, userId: string): Promise<ActionResult> {
  const { supabase } = await getProjectContext(projectId);
  const { error } = await supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
  revalidatePath(`/w/${projectId}/pengaturan`);
  return error ? dbError(error) : { ok: true, message: "Kolaborator dikeluarkan." };
}

export async function acceptInvitation(token: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_project_invitation", { p_token: token });
  if (error) {
    const map: Record<string, string> = {
      INVITATION_INVALID: "Undangan tidak berlaku atau sudah dipakai.",
      INVITATION_EXPIRED: "Undangan sudah kedaluwarsa. Minta pemilik ruang kerja mengundang ulang.",
      INVITATION_EMAIL_MISMATCH: "Email akun Google kamu berbeda dengan email undangan. Masuk dengan email yang diundang, atau minta pemilik mengundang ulang.",
    };
    return fail(Object.entries(map).find(([k]) => error.message.includes(k))?.[1] ?? error.message);
  }
  return { ok: true, data: { projectId: data } };
}

// ---------- Arsip dan hapus ----------

export async function archiveProject(projectId: string, archive: boolean): Promise<ActionResult> {
  const { isOwner } = await getProjectContext(projectId);
  if (!isOwner) return fail("Hanya pemilik yang bisa mengarsipkan.");
  // Proyek terarsip tidak bisa ditulis lewat RLS, jadi status arsip diubah dengan secret key
  const admin = createAdminClient();
  const { error } = await admin.from("wedding_projects").update({ archived_at: archive ? new Date().toISOString() : null }).eq("id", projectId);
  revalidatePath(`/w/${projectId}`, "layout");
  return error ? dbError(error) : { ok: true, message: archive ? "Proyek diarsipkan." : "Proyek diaktifkan kembali." };
}

export async function deleteProject(projectId: string, fd: FormData): Promise<ActionResult> {
  const { supabase, project, isOwner } = await getProjectContext(projectId);
  if (!isOwner) return fail("Hanya pemilik yang bisa menghapus proyek.");
  if (str(fd.get("confirm")) !== project.title) return fail(`Ketik "${project.title}" persis untuk konfirmasi.`);
  const { error } = await supabase.from("wedding_projects").delete().eq("id", projectId);
  if (!error) await deletePrefix(`${projectId}/`).catch(() => {});
  return error ? dbError(error) : { ok: true };
}

export async function setLastActiveProject(projectId: string) {
  const { session, supabase } = await getProjectContext(projectId);
  if (session.profile?.last_active_project_id !== projectId) {
    await supabase.from("profiles").update({ last_active_project_id: projectId }).eq("id", session.user.id);
  }
}
