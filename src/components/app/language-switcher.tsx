"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { LANGS, LANG_LABEL, type Lang } from "@/i18n/config";
import { useLang } from "@/i18n/client";
import { setLanguage } from "@/features/language/actions";
import { useT } from "@/i18n/client";

// Pengalih bahasa. compact = dua tombol kecil (ID | EN) untuk header; bila tidak, kontrol tersegmen dengan nama bahasa.
export function LanguageSwitcher({ compact, className }: { compact?: boolean; className?: string }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  const pick = (l: Lang) => {
    if (l === lang) return;
    start(async () => { await setLanguage(l); router.refresh(); });
  };

  if (compact) {
    const next = LANGS.find((l) => l !== lang) ?? lang;
    return (
      <button onClick={() => pick(next)} lang={lang} aria-label={`${t("Language")}: ${LANG_LABEL[lang]}. ${LANG_LABEL[next]}`} title={LANG_LABEL[next]}
        className={cn("group inline-flex h-10 items-center gap-1.5 rounded-full border border-neutral-200/80 bg-surface pr-3.5 pl-3 text-[12.5px] font-semibold tracking-wide text-neutral-700 uppercase shadow-[0_1px_2px_rgba(62,26,45,0.05)] transition-[border-color,color,transform,box-shadow] duration-200 hover:border-plum-300 hover:text-plum-700 hover:shadow-card active:scale-95", pending && "opacity-60", className)}>
        <Globe className="size-4 text-neutral-400 transition-colors group-hover:text-plum-600" aria-hidden="true" />
        {lang}
      </button>
    );
  }
  return (
    <div role="group" aria-label={t("Language")} className={cn("inline-flex w-full rounded-full bg-neutral-100 p-1", pending && "opacity-60", className)}>
      {LANGS.map((l) => (
        <button key={l} onClick={() => pick(l)} aria-pressed={l === lang} lang={l}
          className={cn("h-9 flex-1 rounded-full px-4 text-sm font-medium transition-colors", l === lang ? "bg-surface text-plum-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900")}>
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
