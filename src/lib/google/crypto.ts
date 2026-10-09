import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Kunci diturunkan dari TOKEN_ENCRYPTION_KEY; bila kosong memakai secret key Supabase yang sudah ada
function secret() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY belum diisi");
  return raw;
}
const derive = (purpose: string) => createHash("sha256").update(`${purpose}:${secret()}`).digest();
const b64 = (b: Buffer) => b.toString("base64url");

// AES-256-GCM: iv.tag.data (base64url)
export function encryptToken(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derive("token"), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [b64(iv), b64(cipher.getAuthTag()), b64(data)].join(".");
}

export function decryptToken(payload: string) {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !data) throw new Error("Token tersimpan rusak");
  const decipher = createDecipheriv("aes-256-gcm", derive("token"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// State OAuth bertanda tangan HMAC dan berumur pendek, mengikat pengguna dan proyek
export function signState(payload: { u: string; p: string }, ttlMs = 10 * 60_000) {
  const body = b64(Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })));
  const sig = b64(createHmac("sha256", derive("state")).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyState(token: string | null): { u: string; p: string } | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64(createHmac("sha256", derive("state")).update(body).digest());
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return typeof data.u === "string" && typeof data.p === "string" ? { u: data.u, p: data.p } : null;
  } catch {
    return null;
  }
}
