"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, Copy, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { buttonClass } from "@/components/ui/button";
import { formatDateCompact, formatIDR } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export type PopupPromo = {
  id: string;
  code: string | null;
  title: string;
  text: string | null;
  cta: string | null;
  label: string; // contoh: "20%" atau "Rp 50.000"
  endsAt: string | null;
  daysLeft: number | null;
  // Harga paket termurah yang memenuhi promo ini: asli dan setelah potongan
  price?: { plan: string; original: number; final: number } | null;
};

// Popup promo hanya tampil di landing page
const SHOWN_ON = "/";
const DISMISS_MS = 24 * 3600 * 1000;
const key = (id: string) => `mp-promo:v1:${id}`;

// Kartu popup, dibuat sederhana: label, judul, harga, kode, satu tombol. Dipakai juga sebagai pratinjau di formulir admin.
export function PromoPopupCard({ promo, onClose, preview }: { promo: PopupPromo; onClose?: () => void; preview?: boolean }) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const href = promo.code ? `/aktivasi?promo=${encodeURIComponent(promo.code)}` : "/aktivasi";
  const left = promo.daysLeft !== null && promo.daysLeft <= 7 ? (promo.daysLeft <= 1 ? t("Berakhir hari ini") : t("{n} hari lagi", { n: promo.daysLeft })) : null;
  const pct = promo.price && promo.price.final < promo.price.original ? Math.round((1 - promo.price.final / promo.price.original) * 100) : null;
  const until = promo.endsAt ? t("Promo berlaku sampai {date}", { date: formatDateCompact(promo.endsAt, undefined, lang) }) : null;
  return (
    <div role={preview ? undefined : "dialog"} aria-label={promo.title} className={cn("relative rounded-2xl border border-neutral-200 bg-surface p-5 shadow-modal", !preview && "pointer-events-auto")}>
      <div className="flex items-center justify-between gap-3 pr-9">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-plum-600 uppercase">{t("Promo")}</span>
        {left && <span className="text-xs font-medium text-neutral-500">{left}</span>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label={t("Tutup")} className="absolute top-2 right-2 z-10 inline-flex size-10 items-center md:top-3 md:right-3 md:size-8 justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
          <X className="size-4" />
        </button>
      )}
      <p className="mt-2 text-lg leading-6 font-semibold text-neutral-900">{promo.title}</p>
      {promo.text && <p className="mt-1 text-[13px] leading-5 text-neutral-600">{promo.text}</p>}

      <div className="mt-4">
        {promo.price ? (
          <p className="tabular flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-[26px] leading-8 font-semibold tracking-tight text-neutral-900">{formatIDR(promo.price.final)}</span>
            {promo.price.final < promo.price.original && <s className="text-sm text-neutral-400">{formatIDR(promo.price.original)}</s>}
            {pct !== null && <span className="text-sm font-semibold text-plum-600">-{pct}%</span>}
          </p>
        ) : (
          <p className="tabular text-[26px] leading-8 font-semibold tracking-tight text-neutral-900">{promo.label} <span className="text-sm font-normal text-neutral-500">{t("potongan")}</span></p>
        )}
        {promo.price && <p className="mt-1 text-[13px] text-neutral-700">{promo.price.plan}</p>}
        {until && <p className="text-xs text-neutral-500">{until}</p>}
      </div>

      {promo.code && (
        <button
          onClick={() => { try { navigator.clipboard?.writeText(promo.code!); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1800); }}
          className="mt-4 flex h-10 w-full items-center justify-between rounded-lg border border-neutral-200 px-3 text-sm transition-colors hover:bg-neutral-50"
          aria-label={t("Salin kode {code}", { code: promo.code })}
        >
          <span className="tabular font-semibold tracking-wide text-neutral-800">{promo.code}</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">{copied ? <><Check className="size-3.5 text-plum-600" />{t("Tersalin")}</> : <><Copy className="size-3.5" />{t("Salin")}</>}</span>
        </button>
      )}
      <Link href={href} onClick={onClose} aria-disabled={preview} tabIndex={preview ? -1 : undefined} className={cn(buttonClass("dark", "md", "mt-3 w-full"), preview && "pointer-events-none")}>
        {promo.cta || t("Pakai promo")}
      </Link>
    </div>
  );
}

export function PromoPopup({ promos }: { promos: PopupPromo[] }) {
  const pathname = usePathname();
  // ?popup=tes mengabaikan batas "sekali per sesi" dan "24 jam setelah ditutup", untuk menguji tampilan
  const force = useSearchParams().get("popup") === "tes";
  const [shown, setShown] = useState<PopupPromo | null>(null);
  const [visible, setVisible] = useState(false);
  const blocked = pathname !== SHOWN_ON;

  useEffect(() => {
    if (blocked || !promos.length) { setVisible(false); return; }
    let candidate: PopupPromo | null = null;
    try {
      if (!force && sessionStorage.getItem("mp-promo-shown")) return;
      const now = Date.now();
      candidate = promos.find((p) => force || now - Number(localStorage.getItem(key(p.id)) ?? 0) > DISMISS_MS) ?? null;
    } catch { candidate = promos[0] ?? null; }
    if (!candidate) return;
    const timer = setTimeout(() => {
      setShown(candidate);
      setVisible(true);
      try { sessionStorage.setItem("mp-promo-shown", "1"); } catch {}
    }, 4000);
    return () => clearTimeout(timer);
  }, [blocked, promos, pathname, force]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    setVisible(false);
    if (shown) { try { localStorage.setItem(key(shown.id), String(Date.now())); } catch {} }
  }

  if (!visible || !shown || blocked) return null;
  return (
    <div className={cn("no-print pointer-events-none fixed inset-x-0 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:block sm:w-[380px] sm:px-0")}>
      <div className="animate-promo-up w-full max-w-[420px] sm:max-w-none">
        <PromoPopupCard promo={shown} onClose={close} />
      </div>
    </div>
  );
}
