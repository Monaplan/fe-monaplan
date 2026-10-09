import "server-only";
import { randomInt } from "node:crypto";

// Crockford Base32 tanpa I, L, O, U
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateAccessCode(): string {
  let s = "";
  for (let i = 0; i < 12; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `MNP-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export function maskCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^MNP/, "");
  return `MNP-${s.slice(0, 4).padEnd(4, "*")}-****-****`;
}

export function generateOrderNumber(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `MNP-${ymd}-${s}`;
}

export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || headers.get("x-real-ip");
  return ip && /^[0-9a-f.:]+$/i.test(ip) ? ip : null;
}
