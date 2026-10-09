import "server-only";

// Kirim email lewat Resend. Bila RESEND_API_KEY kosong, email dilewati tanpa error.
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Monaplan <onboarding@resend.dev>", to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function emailLayout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#FBF5F8;font-family:Arial,sans-serif;color:#1C1619">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    <div style="font-family:Georgia,serif;font-size:24px;color:#8C3A63;margin-bottom:16px">Monaplan</div>
    <div style="background:#fff;border:1px solid #E8E2E5;border-radius:16px;padding:24px">
      <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
      <div style="font-size:14px;line-height:22px;color:#43393E">${body}</div>
    </div>
  </div></body></html>`;
}

export function emailButton(href: string, label: string) {
  return `<p style="margin:20px 0 0"><a href="${href}" style="display:inline-block;background:#8C3A63;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:600">${label}</a></p>`;
}
