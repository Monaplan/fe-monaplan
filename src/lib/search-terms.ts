// Pembersihan kata kunci pencarian. Murni, dipakai server dan diuji tanpa dependensi Next.

// Karakter yang punya arti di filter PostgREST atau pola LIKE dibuang dari kata kunci
export const cleanQuery = (q: string) => q.replace(/[%_,()*\\":;]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

export function parseTerms(q: string): string[] {
  return cleanQuery(q).split(" ").filter(Boolean).slice(0, 5);
}
