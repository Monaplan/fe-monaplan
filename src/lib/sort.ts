export type SortDir = "asc" | "desc";
export type SortColumns = Record<string, { column: string; dir: SortDir }>;

// Urutan daftar dari ?sort=&dir=. Kolom hanya boleh dari daftar yang diizinkan halaman; nilai lain diabaikan,
// jadi teks dari URL tidak pernah masuk ke query.
export function parseSort(sp: { sort?: string; dir?: string }, columns: SortColumns, fallback: string) {
  const key = sp.sort && Object.prototype.hasOwnProperty.call(columns, sp.sort) ? sp.sort : fallback;
  const spec = columns[key]!;
  const dir: SortDir = sp.dir === "asc" || sp.dir === "desc" ? sp.dir : spec.dir;
  return { key, dir, column: spec.column, ascending: dir === "asc" };
}
