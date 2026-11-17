import "server-only";
import { timingSafeEqual } from "node:crypto";

// Kunci tamu pada tautan undangan pribadi: /<slug>?to=<Nama>&k=<kode>. Nama saja tidak cukup untuk membuktikan siapa
// yang membuka tautan (mudah ditebak), jadi jawaban yang sudah tersimpan, perubahannya, dan QR masuk hanya diberikan
// bila kunci cocok dengan kode check-in tamu itu. Menjawab pertama kali tetap bisa dengan nama saja.
export const normalizeKey = (v: unknown): string => (typeof v === "string" ? v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) : "");

export function keyMatches(given: unknown, code: string | null | undefined): boolean {
  const a = normalizeKey(given);
  const b = normalizeKey(code);
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

