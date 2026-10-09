import "server-only";
import { appUrl } from "@/lib/constants";

// calendar.app.created: hanya kalender dan event yang dibuat Monaplan, tidak bisa membaca kalender lain milik pengguna
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
// Login Google lewat alur aplikasi ini hanya bila dinyalakan eksplisit: GOOGLE_CLIENT_ID harus sudah terdaftar
// sebagai "Authorized Client IDs" di penyedia Google pada Supabase, kalau tidak signInWithIdToken menolak token.
export const googleOwnLoginEnabled = () => googleConfigured() && process.env.GOOGLE_OWN_LOGIN === "1";
export const googleRedirectUri = () => `${appUrl()}/api/google/callback`;
export const googleLoginRedirectUri = () => `${appUrl()}/api/auth/google/callback`;

export class GoogleAuthError extends Error {
  constructor(message: string, readonly revoked = false) {
    super(message);
  }
}

export function buildAuthUrl(state: string, loginHint?: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: `openid email ${CALENDAR_SCOPE}`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  if (loginHint) q.set("login_hint", loginHint);
  return `${AUTH_URL}?${q}`;
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...params }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    // invalid_grant = pengguna mencabut izin atau token kedaluwarsa
    throw new GoogleAuthError(json.error_description ?? json.error ?? "Gagal menghubungi Google", json.error === "invalid_grant");
  }
  return json;
}

// Masuk dengan Google lewat alur milik aplikasi: layar persetujuan menampilkan domain kita, bukan alamat Supabase
export function buildLoginUrl(state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleLoginRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state,
  });
  return `${AUTH_URL}?${q}`;
}

export async function exchangeCode(code: string, redirectUri: string = googleRedirectUri()) {
  const j = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  let email: string | null = null;
  try {
    // id_token diterima langsung dari Google lewat TLS, jadi cukup dibaca isinya
    email = JSON.parse(Buffer.from(String(j.id_token).split(".")[1]!, "base64url").toString("utf8")).email ?? null;
  } catch {}
  return { refreshToken: (j.refresh_token as string | undefined) ?? null, accessToken: j.access_token as string, idToken: (j.id_token as string | undefined) ?? null, scope: String(j.scope ?? ""), email };
}

export async function refreshAccessToken(refreshToken: string) {
  const j = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
  return j.access_token as string;
}

export async function revokeToken(token: string) {
  await fetch(REVOKE_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }) }).catch(() => {});
}
