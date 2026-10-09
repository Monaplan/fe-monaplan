"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { LANG_COOKIE, isLang } from "@/i18n/config";

// Simpan pilihan bahasa di cookie (berlaku juga sebelum masuk) dan di profil bila sudah masuk (dipakai email dan notifikasi)
export async function setLanguage(lang: string): Promise<{ ok: boolean }> {
  if (!isLang(lang)) return { ok: false };
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  try {
    const user = await getAuthUser();
    if (user) await (await createClient()).from("profiles").update({ language: lang }).eq("id", user.id);
  } catch {
    // kolom language belum ada (migrasi 5 belum dijalankan): cookie tetap berlaku
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
