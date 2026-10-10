// Alamat ruang kerja. Murni (tanpa server-only) agar bisa dipakai server dan klien.
// Ruang kerja berada di /app/{slug}; UUID lama tetap diterima dan dialihkan ke slug.

export const APP_ROOT = "/app";
// Pola rute untuk revalidatePath: memperbarui semua ruang kerja yang cocok, bukan satu alamat saja
export const APP_ROUTE = "/app/[projectId]";

type Ref = { id: string; slug?: string | null };

export const projectRef = (p: Ref) => p.slug || p.id;

export function projectPath(p: Ref | string, sub = "") {
  const ref = typeof p === "string" ? p : projectRef(p);
  const tail = sub.replace(/^\//, "");
  return `${APP_ROOT}/${ref}${tail ? `/${tail}` : ""}`;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Slug yang boleh dipakai pengguna: huruf kecil, angka, tanda hubung (sama dengan aturan di database)
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Nama rute aplikasi: tidak boleh jadi alamat undangan (domain/slug). Harus sama dengan reserved_slug() di database.
export const RESERVED_SLUGS = new Set(["app", "admin", "akun", "aktivasi", "api", "auth", "checkout", "gabung", "login", "mulai", "onboarding", "privasi", "rsvp", "reset-password", "lupa-password", "icon", "apple-icon", "manifest", "robots", "sitemap", "opengraph-image", "favicon", "proyek"]);

// Tujuan pengalihan setelah masuk. Hanya alamat dalam situs: diawali satu "/", tanpa garis miring terbalik
// (peramban menganggapnya "/"), tanpa karakter kontrol, dan tanpa skema. Selain itu dikembalikan fallback.
export function safeNextPath(next: unknown, fallback = "/mulai"): string {
  if (typeof next !== "string" || next.length > 500) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const u = new URL(next, "http://x.invalid");
    if (u.origin !== "http://x.invalid") return fallback;
  } catch { return fallback; }
  return next;
}
