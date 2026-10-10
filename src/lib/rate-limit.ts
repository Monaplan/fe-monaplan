// Pembatas laju sederhana di memori proses (per instance server). Cukup untuk meredam tebak-tebakan kode dan spam;
// bukan pengganti pembatas di tepi jaringan.
const buckets = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  return list.length > max;
}
