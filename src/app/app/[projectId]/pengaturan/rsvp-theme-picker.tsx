"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { RSVP_THEME_IDS, RSVP_THEMES, type RsvpThemeId } from "@/content/rsvp-themes";
import { setRsvpTemplate } from "@/features/project/actions";
import { playfair } from "@/components/rsvp/fonts";
import { useT } from "@/i18n/client";

// Pilihan tema halaman RSVP tamu: lima kartu pratinjau kecil, semua gratis
export function RsvpThemePicker({ projectId, current, canWrite }: { projectId: string; current: string; canWrite: boolean }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [selected, setSelected] = useState<string>(current);
  const [pending, start] = useTransition();

  function pick(id: RsvpThemeId) {
    if (!canWrite || id === selected) return;
    const prev = selected;
    setSelected(id);
    start(async () => {
      const r = await setRsvpTemplate(projectId, id);
      if (r.ok) { toast(t("Tema undangan diganti ke {name}.", { name: t(RSVP_THEMES[id].name) })); router.refresh(); }
      else { setSelected(prev); toast(r.error, "danger"); }
    });
  }

  return (
    <ul className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label={t("Tema undangan RSVP")}>
      {RSVP_THEME_IDS.map((id) => {
        const th = RSVP_THEMES[id];
        const on = selected === id;
        return (
          <li key={id}>
            <div className={cn("overflow-hidden rounded-2xl border bg-surface transition-[box-shadow,border-color,transform] duration-200", on ? "border-plum-600 shadow-card ring-2 ring-plum-200" : "border-neutral-200 hover:-translate-y-0.5 hover:shadow-card")}>
              <button type="button" role="radio" aria-checked={on} disabled={!canWrite || pending} onClick={() => pick(id)} className="block w-full text-left disabled:cursor-default">
                {/* Pratinjau mini memakai variabel tema yang sama dengan halaman asli */}
                <div style={{ ...th.vars, backgroundColor: "var(--rv-bg)", backgroundImage: "var(--rv-bg-image)", backgroundSize: id === "bali" ? "48px 48px, cover" : id === "noir_luxury" ? "40px 40px, cover" : undefined } as CSSProperties}
                  className={`${playfair.variable} relative flex h-40 flex-col items-center justify-center gap-1.5 px-4 text-[var(--rv-ink)]`}>
                  <span className="text-[8px] font-semibold tracking-[0.2em] text-[var(--rv-accent)] uppercase">The Wedding of</span>
                  <span className="font-[family-name:var(--rv-font)] text-[24px] leading-7 font-medium tracking-[var(--rv-title-track)] [text-transform:var(--rv-title-case)]">Raka &amp; Nadia</span>
                  <span className="my-0.5 h-px w-16 bg-[var(--rv-accent)] opacity-70" />
                  <span className="rounded-[var(--rv-radius)] border border-[var(--rv-card-border)] bg-[var(--rv-card)] px-3 py-1 text-[10px]">13 Maret 2027</span>
                  <span className="mt-1 rounded-full bg-[var(--rv-accent)] px-3 py-1 text-[9px] font-semibold text-[var(--rv-accent-ink)]">Kirim Konfirmasi</span>
                  {on && <span className="absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-full bg-plum-600 text-white shadow"><Check className="size-3.5" /></span>}
                </div>
                <div className="px-4 pt-3">
                  <p className="text-sm font-semibold text-neutral-900">{t(th.name)}</p>
                  <p className="mt-0.5 min-h-10 text-[13px] leading-5 text-neutral-600">{t(th.description)}</p>
                </div>
              </button>
              <div className="px-4 pb-3">
                <a href={`/rsvp/contoh?tema=${id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-plum-700 hover:underline">
                  <ExternalLink className="size-3.5" />{t("Lihat contoh")}
                </a>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
