import { withI18n, type Params } from "@/i18n/translate";
export type ActionResult = { ok: true; message?: string; data?: any } | { ok: false; error: string };

export function dbError(error: { code?: string; message?: string } | null): ActionResult {
  if (!error) return { ok: true };
  if (error.code === "42501" || /row-level security/i.test(error.message ?? "")) {
    return { ok: false, error: "Kamu tidak punya izin mengubah data ini, atau akses ruang kerja sudah berakhir." };
  }
  if (error.code === "23505") return { ok: false, error: "Data yang sama sudah ada." };
  if (error.code === "23514") return { ok: false, error: "Ada isian yang nilainya belum sesuai." };
  return { ok: false, error: error.message ?? "Terjadi kesalahan. Coba lagi, ya." };
}

// error boleh memuat {parameter}; params bila ada ikut dikirim agar klien bisa menerjemahkannya
export function fail(error: string, params?: Params): ActionResult {
  return { ok: false, error: params ? withI18n(error, params) : error };
}

// Hasil sukses dengan pesan dinamis
export function okm(message: string, params?: Params, data?: unknown): ActionResult {
  return { ok: true, message: params ? withI18n(message, params) : message, ...(data !== undefined && { data }) };
}
