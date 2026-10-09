// Konfigurasi bahasa. Murni, dipakai server dan klien.
export const LANGS = ["id", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "id";
export const LANG_COOKIE = "mp-lang";
export const LANG_LABEL: Record<Lang, string> = { id: "Indonesia", en: "English" };

export const isLang = (v: unknown): v is Lang => v === "id" || v === "en";

// Pilih bahasa dari header Accept-Language: "en-US,en;q=0.9,id;q=0.8" -> "en"
export function fromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return DEFAULT_LANG;
  const ranked = header.split(",").map((part) => {
    const [tag, q] = part.trim().split(";q=");
    return { lang: (tag ?? "").slice(0, 2).toLowerCase(), q: q ? Number(q) : 1 };
  }).sort((a, b) => b.q - a.q);
  return (ranked.find((r) => isLang(r.lang))?.lang as Lang | undefined) ?? DEFAULT_LANG;
}
