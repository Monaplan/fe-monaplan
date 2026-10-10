import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EN } from "@/i18n/en";
import type { Lang } from "@/i18n/config";
import { parseTerms } from "./search-terms";

export type SearchGroupKey = "tugas" | "vendor" | "tamu" | "budget" | "pembayaran" | "mahar" | "dokumen" | "acara" | "rundown" | "agenda" | "inspirasi" | "perjalanan";
export type SearchHit = { id: string; group: SearchGroupKey; title: string; sub: string | null; path: string };
export type SearchResult = { groups: { key: SearchGroupKey; hits: SearchHit[] }[]; total: number };

const PER_GROUP = 5;
export const MIN_QUERY = 2;

// Kamus terbalik EN: data bawaan (template tugas, kategori) tersimpan berbahasa Indonesia, sedangkan pengguna mungkin
// mencari dalam bahasa Inggris. Teks Inggris yang memuat kata itu dipetakan ke teks sumber Indonesianya.
let reverse: [string, string][] | null = null;
function indonesianFor(term: string): string[] {
  reverse ??= Object.entries(EN).filter(([k]) => k.length <= 70 && !/[{}%_,()*"\\]/.test(k)).map(([id, en]) => [en.toLowerCase(), id]);
  const t = term.toLowerCase();
  if (t.length < 3) return [];
  const out: string[] = [];
  for (const [en, id] of reverse) {
    if (en.includes(t)) { out.push(id); if (out.length >= 6) break; }
  }
  return out;
}

type Spec = {
  key: SearchGroupKey;
  table: string;
  select: string;
  cols: string[];
  path: (r: any) => string;
  title: (r: any) => string;
  sub?: (r: any) => string | null;
  translateTitle?: boolean;
};

const SPECS: Spec[] = [
  { key: "tugas", table: "tasks", select: "id, title, category, status", cols: ["title", "category", "description"], path: () => "checklist", title: (r) => r.title, sub: (r) => r.category, translateTitle: true },
  { key: "vendor", table: "vendors", select: "id, name, category, contact_person", cols: ["name", "category", "contact_person", "notes"], path: (r) => `vendor/${r.id}`, title: (r) => r.name, sub: (r) => r.category },
  { key: "tamu", table: "guests", select: "id, name, category, rsvp_status", cols: ["name", "phone_e164", "category", "notes"], path: () => "tamu", title: (r) => r.name, sub: (r) => r.category },
  { key: "budget", table: "budget_items", select: "id, name, notes", cols: ["name", "notes"], path: () => "budget", title: (r) => r.name, sub: (r) => r.notes },
  { key: "pembayaran", table: "expense_payments", select: "id, label, kind", cols: ["label"], path: () => "budget", title: (r) => r.label ?? r.kind, sub: (r) => r.kind },
  { key: "mahar", table: "gift_items", select: "id, name, category, store_name", cols: ["name", "category", "store_name"], path: () => "mahar-seserahan", title: (r) => r.name, sub: (r) => r.category },
  { key: "dokumen", table: "documents", select: "id, title, file_name", cols: ["title", "file_name"], path: () => "dokumen", title: (r) => r.title, sub: (r) => r.file_name },
  { key: "acara", table: "wedding_events", select: "id, name, venue_name", cols: ["name", "venue_name", "venue_address"], path: () => "pengaturan?tab=acara", title: (r) => r.name, sub: (r) => r.venue_name },
  { key: "rundown", table: "rundown_items", select: "id, title, pic_name, location", cols: ["title", "pic_name", "location", "description"], path: () => "rundown", title: (r) => r.title, sub: (r) => r.pic_name ?? r.location },
  { key: "inspirasi", table: "inspiration_items", select: "id, title, category, note", cols: ["title", "note", "category"], path: () => "rona-impian", title: (r) => r.title, sub: (r) => r.category },
  { key: "perjalanan", table: "trip_items", select: "id, title, location, kind", cols: ["title", "location", "notes"], path: () => "honeymoon-planner", title: (r) => r.title, sub: (r) => r.location ?? r.kind },
  { key: "agenda", table: "agenda_items", select: "id, title, location", cols: ["title", "location", "description"], path: () => "kalender", title: (r) => r.title, sub: (r) => r.location },
];

// Satu pintu pencarian untuk header dan halaman hasil. Semua kata harus cocok (AND), tiap kata boleh cocok di kolom mana pun (OR).
export async function searchProject(supabase: SupabaseClient, projectId: string, rawQuery: string, lang: Lang): Promise<SearchResult> {
  const terms = parseTerms(rawQuery);
  if (terms.join("").length < MIN_QUERY) return { groups: [], total: 0 };

  const results = await Promise.all(SPECS.map(async (spec) => {
    let q = supabase.from(spec.table).select(spec.select).eq("project_id", projectId);
    for (const term of terms) {
      // Judul bawaan yang sudah diterjemahkan di layar dicocokkan juga lewat teks Indonesia asalnya
      const variants = [term, ...(lang === "en" && spec.translateTitle ? indonesianFor(term) : [])];
      const filters = variants.flatMap((v) => spec.cols.map((c) => `${c}.ilike.%${v}%`));
      q = q.or(filters.join(","));
    }
    const { data } = await q.limit(PER_GROUP * 2);
    const lower = terms[0]!.toLowerCase();
    const hits = ((data ?? []) as any[])
      .map((r): SearchHit => ({ id: r.id, group: spec.key, title: String(spec.title(r) ?? ""), sub: spec.sub?.(r) ?? null, path: spec.path(r) }))
      .sort((a, b) => Number(b.title.toLowerCase().startsWith(lower)) - Number(a.title.toLowerCase().startsWith(lower)))
      .slice(0, PER_GROUP);
    return { key: spec.key, hits };
  }));

  const groups = results.filter((g) => g.hits.length > 0);
  return { groups, total: groups.reduce((s, g) => s + g.hits.length, 0) };
}

// Tautan ke halaman modul dengan penanda baris yang disorot
export function hitHref(base: string, hit: SearchHit) {
  const sep = hit.path.includes("?") ? "&" : "?";
  // Detail vendor sudah menunjuk satu baris; halaman lain memakai ?hl=
  return hit.group === "vendor" ? `${base}/${hit.path}` : `${base}/${hit.path}${sep}hl=${hit.id}`;
}
