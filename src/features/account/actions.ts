"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { normalizePhone } from "@/lib/format";
import { deletePrefix, storagePrefix } from "@/lib/storage";

export async function updateProfile(fd: FormData): Promise<ActionResult> {
  const { user } = await requireUser();
  const phoneRaw = String(fd.get("phone") ?? "").trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return fail("Nomor HP belum valid.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({
    full_name: String(fd.get("full_name") ?? "").trim() || null,
    phone,
    notify_email: fd.get("notify_email") === "on",
  }).eq("id", user.id);
  revalidatePath("/akun");
  return error ? dbError(error) : { ok: true, message: "Profil tersimpan." };
}

// ACC-05: hapus akun beserta proyek milik sendiri
export async function deleteAccount(fd: FormData): Promise<ActionResult> {
  const { user, profile } = await requireUser();
  if (String(fd.get("confirm") ?? "").trim().toLowerCase() !== (profile?.email ?? user.email ?? "").toLowerCase()) {
    return fail("Ketik email akunmu persis untuk konfirmasi.");
  }
  const admin = createAdminClient();
  const { data: projects } = await admin.from("wedding_projects").select("*").eq("owner_id", user.id);
  for (const p of projects ?? []) await deletePrefix(`${storagePrefix(p)}/`).catch(() => {});
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return fail(error.message);
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true };
}
