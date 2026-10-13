// Batas tidak aktif sesi login (PRD 23): 7 hari tanpa membuka Monaplan, lalu harus masuk lagi. Murni (tanpa I/O) agar mudah diuji.
// Nilai cookie "mp-seen" berformat "<kunciSesi>.<epochMs>". Kunci sesi (session_id dari token) mengikat cookie ke satu sesi login,
// jadi cookie basi dari login sebelumnya tidak memaksa logout sesi yang baru.

export const IDLE_COOKIE = "mp-seen";
export const IDLE_MS = 7 * 24 * 60 * 60 * 1000;
// Cookie hanya ditulis ulang bila sudah lebih dari ini sejak penulisan terakhir (hemat Set-Cookie pada setiap permintaan)
export const TOUCH_MS = 5 * 60 * 1000;
// Harus jauh lebih panjang dari IDLE_MS: bila cookie hilang sebelum diperiksa, pengguna yang menganggur tidak akan pernah keluar
export const IDLE_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;
// Nama cookie sesi Supabase: sb-<ref>-auth-token, dan bagian-bagiannya (.0, .1) bila terpecah
export const SB_COOKIE_RE = /^sb-.+-auth-token(\.\d+)?$/;

export type IdleAction = "init" | "ok" | "touch" | "expire";

export function parseSeen(raw: string | undefined | null): { key: string; at: number } | null {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const at = Number(raw.slice(i + 1));
  if (!Number.isFinite(at) || !Number.isInteger(at) || at <= 0) return null;
  return { key: raw.slice(0, i), at };
}

export const makeSeen = (key: string, now: number) => `${key}.${now}`;

// init   = cookie belum ada, rusak, milik sesi lain, atau berisi waktu di masa depan: mulai hitung dari sekarang
// ok     = masih segar, tidak perlu menulis
// touch  = sudah lewat TOUCH_MS: perbarui waktu terakhir dibuka
// expire = lewat IDLE_MS: sesi harus diakhiri
export function evaluateIdle({ cookie, sessionKey, now }: { cookie: string | undefined | null; sessionKey: string; now: number }): { action: IdleAction; value: string } {
  const seen = parseSeen(cookie);
  // Toleransi 1 hari untuk selisih jam, lebih dari itu dianggap tidak sah
  if (!seen || seen.key !== sessionKey || seen.at > now + 24 * 60 * 60 * 1000) return { action: "init", value: makeSeen(sessionKey, now) };
  const idle = now - seen.at;
  if (idle > IDLE_MS) return { action: "expire", value: "" };
  if (idle > TOUCH_MS) return { action: "touch", value: makeSeen(sessionKey, now) };
  return { action: "ok", value: cookie! };
}

export const idleCookieOptions = (secure: boolean) => ({
  httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: IDLE_COOKIE_MAX_AGE,
});

// Penghapusan harus memakai atribut yang sama dengan saat dibuat (Secure, HttpOnly, SameSite), kalau tidak peramban bisa menolaknya
// Next.js membuang maxAge bernilai 0 saat membuat header Set-Cookie, jadi penghapusan memakai tanggal kedaluwarsa di masa lalu
export const idleCookieClear = (secure: boolean) => ({ ...idleCookieOptions(secure), maxAge: 0, expires: new Date(0) });
