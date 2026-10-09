import "server-only";
import { appUrl } from "@/lib/constants";
import { renderEmail, type EmailData, type Lang } from "@/lib/email/templates";

// Kirim email lewat Resend. Bila RESEND_API_KEY kosong, email dilewati tanpa error.
export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Monaplan <onboarding@resend.dev>",
        to, subject, html, ...(text && { text }),
        ...(process.env.SUPPORT_EMAIL && { reply_to: process.env.SUPPORT_EMAIL }),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Render template bertipe lalu kirim. Dipakai semua email transaksional dan pengingat.
export async function sendTemplated(to: string, lang: Lang, data: EmailData): Promise<boolean> {
  const r = renderEmail(lang, data, { appUrl: appUrl() });
  return sendEmail(to, r.subject, r.html, r.text);
}
