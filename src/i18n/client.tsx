"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LANG, type Lang } from "./config";
import { makeT, type Dict, type TFn } from "./translate";

type Ctx = { lang: Lang; t: TFn };
const I18nCtx = createContext<Ctx>({ lang: DEFAULT_LANG, t: makeT(DEFAULT_LANG) });

// dict hanya dikirim untuk bahasa Inggris; pengguna berbahasa Indonesia tidak mengunduh kamus sama sekali
export function I18nProvider({ lang, dict, children }: { lang: Lang; dict?: Dict; children: ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang, dict) }), [lang, dict]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
export const useT = () => useContext(I18nCtx).t;
export const useLang = () => useContext(I18nCtx).lang;
