import type { Lang } from "./config";

// Teks sumber ditulis dalam bahasa Indonesia dan menjadi kuncinya. Bahasa Inggris dicari di kamus EN;
// teks yang belum ada di kamus ditampilkan apa adanya, jadi tidak ada layar yang kosong.
// Kamus tidak diimpor di sini supaya tidak ikut ke bundel klien pengguna berbahasa Indonesia; pemanggil yang
// berbahasa Inggris menyerahkannya lewat argumen dict (server mengimpor langsung, klien menerimanya dari layout).
export type Params = Record<string, string | number | null | undefined>;

export function interpolate(text: string, params?: Params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k] ?? "") : m));
}

// Pesan dari server dengan bagian dinamis: teks Indonesia + pemisah + JSON {kunci, parameter}.
// Konsumen lama tetap bisa menampilkannya lewat t(), yang mengurai pemisah dan menerjemahkan kuncinya.
const SEP = "\u0001";
export function withI18n(text: string, params?: Params) {
  return `${interpolate(text, params)}${SEP}${JSON.stringify({ k: text, p: params ?? {} })}`;
}

export type Dict = Record<string, string>;

export function translate(lang: Lang, text: string, params?: Params, dict?: Dict): string {
  const i = text.indexOf(SEP);
  if (i >= 0) {
    try {
      const { k, p } = JSON.parse(text.slice(i + 1)) as { k: string; p: Params };
      return translate(lang, k, p, dict);
    } catch {
      text = text.slice(0, i);
    }
  }
  const base = lang === "en" ? (dict?.[text] ?? text) : text;
  return interpolate(base, params);
}

export type TFn = (text: string, params?: Params) => string;
export const makeT = (lang: Lang, dict?: Dict): TFn => (text, params) => translate(lang, text, params, dict);
