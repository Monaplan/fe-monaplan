"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/i18n/client";

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return { y: y!, m: (m ?? 1) - 1, d: d ?? 1 }; };
const shift = (s: string, days: number) => { const { y, m, d } = parse(s); const t = new Date(Date.UTC(y, m, d + days)); return toIso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()); };

// Kalender kecil bergaya aplikasi pengganti pemilih tanggal bawaan peramban (yang tidak bisa didesain ulang).
// Minggu dimulai Senin; tanggal sebelum `min` tidak bisa dipilih; mendukung panah, Home/End, dan Escape.
export function DatePopover({ value, min, max, onChange, onClose, onClear, standalone, className }: { value: string; min?: string; max?: string; onChange: (v: string) => void; onClose: () => void; onClear?: () => void; standalone?: boolean; className?: string }) {
  const { t, lang } = useI18n();
  const loc = lang === "en" ? "en-US" : "id-ID";
  const sel = value ? parse(value) : null;
  const [view, setView] = useState(() => { const b = value ? parse(value) : parse(toIso(new Date().getFullYear(), new Date().getMonth(), 1)); return { y: b.y, m: b.m }; });
  const [focus, setFocus] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // Dipakai tanpa AnchoredPopover (mis. di landing): klik di luar dan Escape ditangani di sini
  useEffect(() => {
    if (!standalone) return;
    const down = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [standalone, onClose]);

  useEffect(() => { if (focus) root.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus(); }, [focus, view]);

  const title = useMemo(() => new Intl.DateTimeFormat(loc, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(view.y, view.m, 1))), [view, loc]);
  // Senin sampai Minggu; 1 Jan 2024 adalah hari Senin
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(loc, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + i)))), [loc]);
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1));
    const lead = (first.getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    return [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  }, [view]);
  const now = new Date();
  const todayIso = toIso(now.getFullYear(), now.getMonth(), now.getDate());
  const move = (dm: number) => setView((v) => { const t = new Date(Date.UTC(v.y, v.m + dm, 1)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() }; });
  const disabled = (iso: string) => (!!min && iso < min) || (!!max && iso > max);
  const nav = "inline-flex size-9 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-plum-50 hover:text-plum-700 focus-visible:ring-2 focus-visible:ring-plum-300 focus-visible:outline-none";
  const tabStop = sel && sel.y === view.y && sel.m === view.m ? sel.d : cells.find((c) => c !== null && !disabled(toIso(view.y, view.m, c))) ?? 1;

  function onKey(e: React.KeyboardEvent, iso: string) {
    const delta = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = shift(iso, delta);
    if (disabled(next)) return;
    const n = parse(next);
    if (n.y !== view.y || n.m !== view.m) setView({ y: n.y, m: n.m });
    setFocus(next);
  }

  return (
    <div ref={root} role="dialog" aria-label={t("Pilih tanggal pernikahan")} className={cn("animate-pop-in w-[308px] max-w-[calc(100vw-2rem)] rounded-2xl border border-neutral-200 bg-surface p-4 shadow-modal", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex">
          <button type="button" onClick={() => move(-12)} aria-label={t("Tahun sebelumnya")} className={nav}><ChevronsLeft className="size-4" /></button>
          <button type="button" onClick={() => move(-1)} aria-label={t("Bulan sebelumnya")} className={nav}><ChevronLeft className="size-4" /></button>
        </div>
        <p className="text-[15px] font-semibold text-neutral-900 capitalize" aria-live="polite">{title}</p>
        <div className="flex">
          <button type="button" onClick={() => move(1)} aria-label={t("Bulan berikutnya")} className={nav}><ChevronRight className="size-4" /></button>
          <button type="button" onClick={() => move(12)} aria-label={t("Tahun berikutnya")} className={nav}><ChevronsRight className="size-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {weekdays.map((w) => <span key={w} className="pb-1.5 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">{w.slice(0, 3)}</span>)}
      </div>
      <div role="grid" className="grid grid-cols-7 gap-y-0.5 text-center">
        {cells.map((c, i) => {
          if (c === null) return <span key={`e${i}`} aria-hidden="true" />;
          const iso = toIso(view.y, view.m, c);
          const isSel = value === iso, isToday = iso === todayIso, off = disabled(iso);
          return (
            <button key={iso} type="button" data-date={iso} disabled={off} tabIndex={c === tabStop ? 0 : -1} aria-pressed={isSel}
              aria-label={new Intl.DateTimeFormat(loc, { dateStyle: "full", timeZone: "UTC" }).format(new Date(Date.UTC(view.y, view.m, c)))}
              onClick={() => { onChange(iso); onClose(); }} onKeyDown={(e) => onKey(e, iso)}
              className={cn("mx-auto inline-flex size-10 items-center justify-center rounded-full text-[14px] transition-colors focus-visible:ring-2 focus-visible:ring-plum-300 focus-visible:outline-none",
                isSel ? "bg-plum-600 font-semibold text-white shadow-btn" : off ? "cursor-not-allowed text-neutral-300" : "text-neutral-800 hover:bg-plum-50 hover:text-plum-700",
                isToday && !isSel && "font-semibold text-plum-700 ring-1 ring-plum-300")}>
              {c}
            </button>
          );
        })}
      </div>
      {(onClear || !disabled(todayIso)) && (
        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-[13px] font-medium">
          {onClear ? <button type="button" onClick={() => { onClear(); onClose(); }} className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800">{t("Kosongkan")}</button> : <span />}
          {!disabled(todayIso) && <button type="button" onClick={() => { onChange(todayIso); onClose(); }} className="rounded-md px-2 py-1 text-plum-700 hover:bg-plum-50">{t("Hari ini")}</button>}
        </div>
      )}
    </div>
  );
}
