"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/constants";
import { sendTemplated } from "@/lib/email";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { UUID_RE } from "@/lib/paths";
import { adminContext } from "@/features/admin/context";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);

// Pengguna mengirim pertanyaan. Disimpan sebagai tiket (RLS: hanya miliknya), lalu email konfirmasi ke pengguna dan salinan ke tim.
export async function createTicket(fd: FormData): Promise<ActionResult> {
  const { user, profile } = await requireUser();
  const subject = str(fd.get("subject"));
  const message = str(fd.get("message"));
  const projectId = str(fd.get("project_id"));
  if (!subject || subject.length < 3) return fail("Tulis subjek singkat (minimal 3 karakter).");
  if (subject.length > 120) return fail("Subjek maksimal 120 karakter.");
  if (!message || message.length < 5) return fail("Pesan terlalu pendek.");
  if (message.length > 4000) return fail("Pesan maksimal 4.000 karakter.");

  const supabase = await createClient();
  // Batas wajar agar formulir tidak dipakai untuk membanjiri: 5 tiket terbuka per pengguna
  const { count } = await supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "open");
  if ((count ?? 0) >= 5) return fail("Kamu masih punya 5 pertanyaan yang belum selesai. Tunggu balasan kami dulu.");

  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id,
    project_id: projectId && UUID_RE.test(projectId) ? projectId : null,
    subject,
    message,
  });
  if (error) {
    if (error.code === "42P01") return fail("Fitur bantuan belum siap di database. Jalankan migrasi 20261009000005 di Supabase.");
    return dbError(error);
  }

  const lang = profile?.language === "en" ? "en" : "id";
  const email = profile?.email ?? user.email;
  const name = profile?.full_name ?? email?.split("@")[0] ?? "";
  if (email) await sendTemplated(email, lang, { kind: "support_received", name, subject, url: `${appUrl()}/akun/bantuan` });
  const staff = process.env.SUPPORT_EMAIL;
  if (staff) await sendTemplated(staff, "id", { kind: "support_ticket", name: "Tim Monaplan", from: name, email: email ?? "-", subject, message, url: `${appUrl()}/admin/bantuan` });
  revalidatePath("/admin/bantuan");
  return { ok: true, message: lang === "en" ? "Message sent. We will reply by email." : "Pesan terkirim. Kami balas lewat email." };
}

// Admin: tandai tiket selesai atau buka lagi
export async function setTicketStatus(id: string, status: "open" | "closed"): Promise<ActionResult> {
  const { admin, audit } = await adminContext();
  const { error } = await admin.from("support_tickets").update({ status, closed_at: status === "closed" ? new Date().toISOString() : null }).eq("id", id);
  if (error) return dbError(error);
  await audit("ticket.status", "support_ticket", id, { status });
  revalidatePath("/admin/bantuan");
  return { ok: true, message: status === "closed" ? "Tiket diselesaikan." : "Tiket dibuka lagi." };
}
