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

export function fail(error: string): ActionResult {
  return { ok: false, error };
}
