import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, fromAcceptLanguage, isLang, type Lang } from "./config";
import { makeT, type TFn } from "./translate";

// Bahasa permintaan ini: cookie pilihan pengguna, lalu Accept-Language peramban, lalu Indonesia
export const getLang = cache(async (): Promise<Lang> => {
  try {
    const fromCookie = (await cookies()).get(LANG_COOKIE)?.value;
    if (isLang(fromCookie)) return fromCookie;
    return fromAcceptLanguage((await headers()).get("accept-language"));
  } catch {
    return DEFAULT_LANG;
  }
});

export async function getT(): Promise<TFn> {
  return makeT(await getLang());
}

// Dipakai komponen server yang butuh t dan lang sekaligus (mis. untuk memformat tanggal)
export async function getI18n() {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}
