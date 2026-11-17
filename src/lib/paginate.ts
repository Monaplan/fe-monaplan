// Pengambilan semua baris dengan paginasi. API Supabase memotong hasil di Max Rows (bawaan 1000) walau .limit() lebih besar,
// jadi daftar yang bisa melebihi itu (tamu resepsi besar, semua proyek di cron, buku kas) diambil per halaman dan digabung.
// Bentuk hasil sama dengan pemanggilan biasa ({ data, error }) supaya pemanggil tidak berubah.
// build harus mengurutkan hasil secara stabil (tambahkan .order("id") di akhir) supaya tidak ada baris terlewat atau ganda.
type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function fetchAll<T = any>(build: (from: number, to: number) => Page<T>, pageSize = 1000, maxPages = 100): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const all: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const { data, error } = await build(page * pageSize, page * pageSize + pageSize - 1);
    if (error) return { data: null, error };
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return { data: all, error: null };
}
