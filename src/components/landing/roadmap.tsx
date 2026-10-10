"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Pencil } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/i18n/client";
import { DatePopover } from "@/components/ui/date-popover";

export type RoadmapPhase = { key: string; count: number };

// Peta jalan dari 12 bulan sebelum sampai sesudah hari H. Jumlah tugas diambil dari checklist rekomendasi yang nyata
// (dihitung di server), dan fase pengunjung ditentukan di peramban dari tanggal yang diisi.
const PHASES = [
  { key: "dasar", from: 180, range: "Lebih dari 6 bulan", title: "Susun fondasinya", text: "Tanggal, budget, dan daftar tamu awal.", tools: ["Checklist", "Budget"] },
  { key: "vendor", from: 90, range: "3 sampai 6 bulan", title: "Kunci vendor dan dokumen", text: "Booking vendor, dokumen KUA, dan catat DP.", tools: ["Vendor", "Dokumen"] },
  { key: "undangan", from: 30, range: "1 sampai 3 bulan", title: "Undang dan pantau RSVP", text: "Kirim link RSVP lewat WhatsApp, rekap porsi.", tools: ["Tamu & RSVP", "Mahar & Seserahan"] },
  { key: "harih", from: 0, range: "Kurang dari 1 bulan", title: "Rapikan hari H", text: "Finalkan rundown dan lunasi vendor.", tools: ["Rundown Hari H", "Reminder & Calendar"] },
  { key: "pasca", from: -9999, range: "Setelah hari H", title: "Urus yang tersisa", text: "Ambil hasil foto, perbarui dokumen, lalu berangkat berdua.", tools: ["Honeymoon Planner"] },
] as const;

const DAY = 86_400_000;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function Roadmap({ counts }: { counts: RoadmapPhase[] }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const [date, setDate] = useState("");
  const [today, setToday] = useState("");

  // Tanggal contoh diisi setelah tampil di peramban agar hasil server dan klien sama
  useEffect(() => {
    const now = new Date();
    setToday(iso(now));
    setDate(iso(new Date(now.getTime() + 150 * DAY)));
  }, []);

  const days = useMemo(() => {
    if (!date) return null;
    const [y, m, d] = date.split("-").map(Number);
    const target = new Date(y!, (m ?? 1) - 1, d ?? 1).getTime();
    const n = new Date(); const start = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
    return Math.round((target - start) / DAY);
  }, [date]);
  // Tanggal dipecah untuk lembar kalender dan rincian "N bulan · N minggu · N hari"
  const parts = useMemo(() => {
    if (!date) return null;
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { ...o, timeZone: "UTC" }).format(dt);
    return { day: f({ day: "numeric" }), month: f({ month: "short" }), monthLong: f({ month: "long" }), year: f({ year: "numeric" }), weekday: f({ weekday: "long" }) };
  }, [date, lang]);
  const span = useMemo(() => {
    if (days === null || days <= 0) return "";
    const bits: [number, string][] = [[Math.floor(days / 30), t("bulan")], [Math.floor((days % 30) / 7), t("minggu")], [(days % 30) % 7, t("hari")]];
    return bits.filter(([n]) => n > 0).map(([n, u]) => `${n} ${u}`).join(" · ");
  }, [days, t]);
  const active = days === null ? -1 : days < 0 ? PHASES.length - 1 : PHASES.findIndex((p) => days >= p.from);
  const total = counts.reduce((s, c) => s + c.count, 0);
  const countOf = (k: string) => counts.find((c) => c.key === k)?.count ?? 0;

  return (
    <div>
      {/* Pemilih tanggal sederhana: satu baris, klik untuk mengubah */}
      <div className="relative mx-auto mb-10 flex max-w-md flex-col items-center gap-2">
        <span className="text-[12px] font-semibold tracking-[0.14em] text-plum-600 uppercase">{t("Tanggal pernikahanmu")}</span>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open} aria-label={t("Ubah tanggal")}
          className="inline-flex h-12 items-center gap-3 rounded-full border border-neutral-200 bg-surface px-5 text-[15px] font-medium text-neutral-900 shadow-card transition-colors hover:border-plum-300">
          <CalendarDays className="size-5 text-plum-600" aria-hidden="true" />
          <span key={date} className="animate-pop-in">{parts ? `${parts.weekday}, ${parts.day} ${parts.monthLong} ${parts.year}` : " "}</span>
          <Pencil className="size-3.5 text-neutral-400" aria-hidden="true" />
        </button>
        <p className="text-[14px] text-neutral-600" aria-live="polite">
          {days === null ? " " : days < 0 ? t("Tanggal itu sudah lewat.") : days === 0 ? t("Hari ini hari H!") : <><span className="font-semibold text-plum-700">{t("{n} hari lagi", { n: days })}</span>{span && <span> · {span}</span>}</>}
        </p>
        {open && date && <DatePopover standalone value={date} min={today || undefined} onChange={setDate} onClose={close} className="absolute inset-x-0 top-[4.5rem] z-30 mx-auto" />}
      </div>

      <ol className="relative grid gap-3 md:grid-cols-5 md:gap-0">
        <span aria-hidden="true" className="absolute top-[22px] right-[10%] left-[10%] hidden h-px bg-plum-200 md:block" />
        {PHASES.map((p, i) => {
          const on = i === active;
          const done = active > i;
          return (
            <li key={p.key} className="relative md:px-2">
              <div className="flex items-start gap-3 md:flex-col md:items-center md:text-center">
                <span className={cn("relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors", on ? "border-plum-600 bg-plum-600 text-white shadow-pop" : done ? "border-plum-300 bg-plum-100 text-plum-700" : "border-plum-200 bg-surface text-plum-600")}>{i + 1}</span>
                <div className={cn("min-w-0 flex-1 rounded-2xl border bg-surface p-4 transition-[border-color,box-shadow] duration-200 md:mt-4 md:w-full", on ? "border-plum-500 shadow-pop" : "border-neutral-200/80")}>
                  <p className="text-[11px] font-semibold tracking-[0.1em] text-plum-600 uppercase">{t(p.range)}</p>
                  <p className="mt-0.5 text-[15px] leading-5 font-semibold text-neutral-900">{t(p.title)}</p>
                  <p className="mt-1 text-[13px] leading-5 text-neutral-600">{t(p.text)}</p>
                  {p.key !== "pasca" && countOf(p.key) > 0 && (
                    <p className="mt-2.5 text-[12px] font-semibold text-plum-700"><span className="tabular text-[18px]">{countOf(p.key)}</span> {t("tugas rekomendasi")}</p>
                  )}
                  <ul className="mt-2.5 flex flex-wrap gap-1.5 md:justify-center">
                    {p.tools.map((x) => <li key={x} className="rounded-full bg-plum-50 px-2 py-0.5 text-[11px] font-medium text-plum-700">{t(x)}</li>)}
                  </ul>
                  {on && <p className="mt-3 inline-flex rounded-full bg-plum-600 px-2.5 py-1 text-[11px] font-semibold text-white">{t("Kamu di sini")}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {total > 0 && <p className="mt-6 text-center text-[13px] text-neutral-500">{t("Total {n} tugas rekomendasi sudah terisi otomatis begitu kamu mengisi data pernikahan.", { n: total })}</p>}
    </div>
  );
}
