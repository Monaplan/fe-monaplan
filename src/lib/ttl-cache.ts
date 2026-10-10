import "server-only";

// Cache singkat di memori untuk data publik yang jarang berubah (pengaturan, promo, paket). Setiap permintaan landing
// dan harga tidak perlu bolak-balik ke database. Admin yang mengubahnya memanggil bustPublicCache() sehingga
// perubahan langsung terlihat; instance lain paling lambat ikut berubah setelah ttl.
const store = new Map<string, { at: number; value: unknown; pending?: Promise<unknown> }>();

export async function ttl<T>(key: string, ms: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && now - hit.at < ms && !hit.pending) return hit.value as T;
  // Permintaan serentak berbagi satu pemuatan
  if (hit?.pending) return hit.pending as Promise<T>;
  const pending = load().then((value) => {
    store.set(key, { at: Date.now(), value });
    return value;
  }, (e) => { store.delete(key); throw e; });
  store.set(key, { at: hit?.at ?? 0, value: hit?.value, pending });
  return pending;
}

export function bustPublicCache() {
  store.clear();
}
