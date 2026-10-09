import type { Lang } from "./config";
import { EN } from "./en";

// Teks sumber ditulis dalam bahasa Indonesia dan menjadi kuncinya. Bahasa Inggris dicari di kamus EN;
// teks yang belum ada di kamus ditampilkan apa adanya, jadi tidak ada layar yang kosong.
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

export function translate(lang: Lang, text: string, params?: Params): string {
  const i = text.indexOf(SEP);
  if (i >= 0) {
    try {
      const { k, p } = JSON.parse(text.slice(i + 1)) as { k: string; p: Params };
      return translate(lang, k, p);
    } catch {
      text = text.slice(0, i);
    }
  }
  const base = lang === "en" ? (EN[text] ?? text) : text;
  return interpolate(base, params);
}

export type TFn = (text: string, params?: Params) => string;
export const makeT = (lang: Lang): TFn => (text, params) => translate(lang, text, params);
