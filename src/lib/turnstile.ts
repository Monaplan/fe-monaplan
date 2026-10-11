import "server-only";

// Memeriksa token Cloudflare Turnstile di server. Tanpa TURNSTILE_SECRET_KEY pemeriksaan dilewati (captcha belum dipasang).
// Gagal menghubungi Cloudflare dihitung gagal, supaya captcha tidak bisa dilewati dengan memblokir permintaannya.
export async function verifyTurnstile(token: unknown, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const j = (await res.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}
