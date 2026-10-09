"use server";

import { appUrl } from "@/lib/constants";
import { sendTemplated } from "@/lib/email";
import { EMAIL_KINDS, sampleData, type EmailKind, type Lang } from "@/lib/email/templates";
import { fail, okm, type ActionResult } from "@/lib/result";
import { adminContext } from "./context";

// Kirim contoh email ke alamat admin yang sedang masuk, untuk memeriksa tampilan di kotak masuk sungguhan
export async function sendTestEmail(kind: EmailKind, lang: Lang): Promise<ActionResult> {
  const { admin, audit, adminId } = await adminContext();
  if (!EMAIL_KINDS.includes(kind) || (lang !== "id" && lang !== "en")) return fail("Pilihan tidak valid.");
  if (!process.env.RESEND_API_KEY) return fail("RESEND_API_KEY belum diisi di .env.");
  const { data: me } = await admin.from("profiles").select("email, full_name").eq("id", adminId).single();
  if (!me) return fail("Profil admin tidak ditemukan.");
  const ok = await sendTemplated(me.email, lang, { ...sampleData(kind, appUrl()), name: me.full_name ?? me.email.split("@")[0]! });
  if (!ok) return fail("Resend menolak pengiriman. Cek kunci API dan apakah domain pengirim (EMAIL_FROM) sudah terverifikasi.");
  await audit("email.test", "email", kind, { lang });
  return okm("Contoh email terkirim ke {email}.", { email: me.email });
}
