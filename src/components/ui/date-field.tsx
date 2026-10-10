"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, X } from "lucide-react";
import { cn } from "./cn";
import { inputClass } from "./form";
import { AnchoredPopover } from "./anchored-popover";
import { DatePopover } from "./date-popover";
import { useI18n } from "@/i18n/client";

// Nilai terkontrol atau tak terkontrol; input tersembunyi membawa nilainya ke FormData dan ikut validasi "required"
function useValue(value: string | undefined, defaultValue: string | undefined, onChange?: (v: string) => void) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const val = value !== undefined ? value : inner;
  const set = (v: string) => { if (value === undefined) setInner(v); onChange?.(v); };
  return [val, set] as const;
}

type FieldProps = {
  id?: string; name?: string; value?: string; defaultValue?: string; onChange?: (v: string) => void;
  required?: boolean; placeholder?: string; className?: string; disabled?: boolean; "aria-invalid"?: boolean;
};

// Isian tanggal dengan kalender bergaya aplikasi (pengganti <input type="date"> yang popupnya tidak bisa didesain)
export function DateField({ id, name, value, defaultValue, onChange, min, max, required, placeholder, className, disabled, ...rest }: FieldProps & { min?: string; max?: string }) {
  const { t, lang } = useI18n();
  const [val, setVal] = useValue(value, defaultValue, onChange);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const label = val ? new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${val}T00:00:00Z`)) : "";
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  return (
    <div className="relative">
      {/* Nilai yang dikirim form; teks biasa agar atribut required tetap bekerja, disembunyikan dari tampilan */}
      <input name={name} value={val} onChange={() => {}} required={required} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-0" />
      <button ref={btn} id={id} type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-invalid={rest["aria-invalid"]}
        className={cn(inputClass, "flex items-center justify-between gap-2 text-left", !val && "text-neutral-400", className)}>
        <span className="truncate">{label || placeholder || t("Pilih tanggal")}</span>
        <CalendarDays className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
      </button>
      {open && (
        <AnchoredPopover anchor={btn} onClose={() => setOpen(false)}>
          <DatePopover value={val} min={min} max={max} onChange={setVal} onClose={() => setOpen(false)} onClear={required ? undefined : () => setVal("")} />
        </AnchoredPopover>
      )}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const pad = (n: number) => String(n).padStart(2, "0");

// Isian jam: dua kolom (jam dan menit per 5 menit) di popover, pengganti <input type="time">
export function TimeField({ id, name, value, defaultValue, onChange, required, placeholder, className, disabled, ...rest }: FieldProps) {
  const { t } = useI18n();
  const [val, setVal] = useValue(value, defaultValue, onChange);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const [h, m] = val ? val.split(":").map(Number) : [null, null];
  const minutes = Array.from(new Set([...Array.from({ length: 12 }, (_, i) => i * 5), ...(m !== null && m !== undefined ? [m] : [])])).sort((a, b) => a - b);
  const colRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) colRef.current?.querySelectorAll<HTMLElement>("[data-on=true]").forEach((el) => el.scrollIntoView({ block: "center" })); }, [open]);
  const item = (on: boolean) => cn("flex h-9 w-full items-center justify-center rounded-lg text-[14px] transition-colors", on ? "bg-plum-600 font-semibold text-white" : "text-neutral-800 hover:bg-plum-50 hover:text-plum-700");
  return (
    <div className="relative">
      <input name={name} value={val} onChange={() => {}} required={required} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-0" />
      <button ref={btn} id={id} type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-invalid={rest["aria-invalid"]}
        className={cn(inputClass, "flex items-center justify-between gap-2 text-left", !val && "text-neutral-400", className)}>
        <span className="tabular truncate">{val || placeholder || t("Pilih jam")}</span>
        <Clock className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
      </button>
      {open && (
        <AnchoredPopover anchor={btn} onClose={() => setOpen(false)} width={220}>
          <div role="dialog" aria-label={t("Pilih jam")} className="animate-pop-in w-[220px] rounded-2xl border border-neutral-200 bg-surface p-3 shadow-modal">
            <div ref={colRef} className="grid grid-cols-2 gap-2">
              <div>
                <p className="pb-1.5 text-center text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">{t("Jam")}</p>
                <div className="scrollbar-thin flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-1">
                  {HOURS.map((x) => <button key={x} type="button" data-on={h === x} onClick={() => setVal(`${pad(x)}:${pad(m ?? 0)}`)} className={item(h === x)}>{pad(x)}</button>)}
                </div>
              </div>
              <div>
                <p className="pb-1.5 text-center text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">{t("Menit")}</p>
                <div className="scrollbar-thin flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-1">
                  {minutes.map((x) => <button key={x} type="button" data-on={m === x} onClick={() => { setVal(`${pad(h ?? 0)}:${pad(x)}`); setOpen(false); }} className={item(m === x)}>{pad(x)}</button>)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-[13px] font-medium">
              {required ? <span /> : <button type="button" onClick={() => { setVal(""); setOpen(false); }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"><X className="size-3.5" />{t("Kosongkan")}</button>}
              <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-plum-700 hover:bg-plum-50">{t("Selesai")}</button>
            </div>
          </div>
        </AnchoredPopover>
      )}
    </div>
  );
}
