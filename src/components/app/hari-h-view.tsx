"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock, Hourglass, ListPlus, MapPin, Phone, ScanLine, Store, Users, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/components/ui/cn";
import { diffDays, formatDateLong, formatTime, isoDateInTz, waLink } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import type { DayData, DayRundown } from "@/lib/hari-h";

const REFRESH_MS = 30_000;

// Tanggal dan menit saat ini di zona waktu proyek
function nowIn(tz: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), clock: `${parts.hour}.${parts.minute}` };
}
const mins = (t: string | null) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null);
const hhmm = (t: string | null) => (t ? t.slice(0, 5).replace(":", ".") : "");

// Mode Hari H (DESIGN.md 20.5). Dipakai halaman anggota dan tautan panitia; aksi tambahan masuk lewat slot.
export function HariHView({ data, header, onToggleTask, checkin, extra, staff, rundownHref, arrivedHref }: {
  data: DayData;
  header?: ReactNode;
  onToggleTask?: (id: string, done: boolean) => Promise<boolean | void>;
  checkin?: { open: () => void } | null;
  extra?: ReactNode;
  staff?: boolean;
  rundownHref?: string;
  arrivedHref?: string;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [now, setNow] = useState(() => nowIn(data.tz));
  const [online, setOnline] = useState(true);
  const [, start] = useTransition();

  // Acara default: yang berlangsung hari ini, lalu yang terdekat berikutnya, lalu yang terakhir
  const defaultEvent = useMemo(() => {
    const dated = data.events.filter((e) => e.starts_at);
    const today = dated.find((e) => isoDateInTz(e.starts_at!, data.tz) === now.date);
    const next = dated.find((e) => isoDateInTz(e.starts_at!, data.tz) > now.date);
    return (today ?? next ?? dated[dated.length - 1] ?? data.events[0])?.id ?? "";
  }, [data.events, data.tz]); // eslint-disable-line react-hooks/exhaustive-deps
  const [eventId, setEventId] = useState(defaultEvent);
  const event = data.events.find((e) => e.id === eventId) ?? null;
  const items = data.rundown.filter((r) => r.event_id === eventId);
  const isToday = !!event?.starts_at && isoDateInTz(event.starts_at, data.tz) === now.date;

  // Jam berjalan tiap 20 detik; data dimuat ulang tiap 30 detik saat halaman terlihat dan perangkat online
  useEffect(() => {
    const tick = setInterval(() => setNow(nowIn(data.tz)), 20_000);
    const refresh = setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) start(() => router.refresh()); }, REFRESH_MS);
    const on = () => setOnline(true), off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { clearInterval(tick); clearInterval(refresh); window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [data.tz, router]);

  // Layar tetap menyala selama halaman terbuka (bila peramban mendukung)
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const req = async () => {
      try { lock = await (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null; } catch {}
    };
    const onVis = () => { if (document.visibilityState === "visible") req(); };
    req();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); lock?.release().catch(() => {}); };
  }, []);

  const { current, next } = useMemo(() => {
    if (!isToday) return { current: null as DayRundown | null, next: items[0] ?? null };
    let cur: DayRundown | null = null, nxt: DayRundown | null = null;
    items.forEach((it, i) => {
      const s = mins(it.start_time)!, e = mins(it.end_time) ?? mins(items[i + 1]?.start_time ?? null) ?? s + 30;
      if (s <= now.minutes && now.minutes < e) cur = it;
      if (!nxt && s > now.minutes) nxt = it;
    });
    return { current: cur, next: nxt };
  }, [items, isToday, now.minutes]);

  const vendorById = Object.fromEntries(data.vendors.map((v) => [v.id, v]));
  const att = data.attendance;
  const loaded = formatTime(data.loadedAt, data.tz, false, lang);

  const days = event?.starts_at ? diffDays(now.date, isoDateInTz(event.starts_at, data.tz)) : null;
  const meta = (it: DayRundown) => [it.pic_name && t("PIC: {name}", { name: it.pic_name }), it.location].filter(Boolean).join(" · ");
  const hasSide = !!extra || data.vendors.length > 0 || data.tasks.length > 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {!online && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-caution-bg px-4 py-2.5 text-[13px] font-medium text-caution">
          <WifiOff className="size-4 shrink-0" />{t("Offline · data pukul {time}", { time: loaded })}</p>
      )}

      {/* Judul dan jam */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">{header}</div>
        <span className="tabular inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-surface px-4 text-[17px] font-bold text-neutral-900" aria-label={t("Jam sekarang {time}", { time: now.clock })}>
          <Clock className="size-4 text-plum-600" aria-hidden="true" />{now.clock}</span>
      </div>

      {/* Acara yang ditampilkan */}
      {event && (
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-surface p-4 sm:flex-row sm:items-center sm:gap-4">
          {data.events.length > 1 ? (
            <Select value={eventId} onChange={(e) => setEventId(e.target.value)} aria-label={t("Pilih acara")} className="sm:w-56">
              {data.events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          ) : <p className="text-[15px] font-semibold text-neutral-900">{event.name}</p>}
          <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-neutral-600">
            {event.starts_at && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-neutral-400" aria-hidden="true" />{formatDateLong(event.starts_at, data.tz, lang)} · {formatTime(event.starts_at, data.tz, false, lang)}</span>}
            {event.venue_name && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="size-4 shrink-0 text-neutral-400" aria-hidden="true" /><span className="truncate">{event.venue_name}</span></span>}
          </p>
          {days !== null && (
            <span className={cn("inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-[12.5px] font-semibold",
              days === 0 ? "bg-plum-600 text-white" : days > 0 ? "bg-plum-100 text-plum-700" : "bg-neutral-100 text-neutral-600")}>
              {days === 0 ? t("Hari ini") : days > 0 ? t("{n} hari lagi", { n: days.toLocaleString(lang === "en" ? "en-US" : "id-ID") }) : t("Sudah lewat")}
            </span>
          )}
        </div>
      )}

      {/* Status: sekarang dan berikutnya pada hari H; satu kartu ringkas di luar hari H atau bila rundown kosong */}
      {isToday && items.length > 0 ? (
        <div data-tour="harih-now" className="grid gap-3 sm:grid-cols-2">
          <div className={cn("rounded-2xl p-5", current ? "bg-plum-700 text-white" : "border border-neutral-200 bg-surface")}>
            <p className={cn("text-[11px] font-bold tracking-widest uppercase", current ? "text-white/70" : "text-neutral-500")}>{t("Sekarang")}</p>
            {current ? (
              <>
                <p className="tabular mt-2 text-[20px] font-bold">{hhmm(current.start_time)}{current.end_time && ` - ${hhmm(current.end_time)}`}</p>
                <p className="mt-1 text-[24px] leading-8 font-semibold">{current.title}</p>
                {meta(current) && <p className="mt-2 text-[14px] text-white/80">{meta(current)}</p>}
              </>
            ) : <p className="mt-2 text-[15px] text-neutral-600">{t("Tidak ada kegiatan yang sedang berjalan.")}</p>}
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-surface p-5">
            <p className="text-[11px] font-bold tracking-widest text-neutral-500 uppercase">{t("Berikutnya")}</p>
            {next ? (
              <>
                <p className="tabular mt-2 text-[20px] font-bold text-neutral-900">{hhmm(next.start_time)}</p>
                <p className="mt-1 text-[20px] leading-7 font-semibold text-neutral-900">{next.title}</p>
                {meta(next) && <p className="mt-2 text-[14px] text-neutral-600">{meta(next)}</p>}
              </>
            ) : <p className="mt-2 text-[15px] text-neutral-600">{current ? t("Ini kegiatan terakhir.") : t("Semua kegiatan sudah lewat.")}</p>}
          </div>
        </div>
      ) : (
        <div data-tour="harih-now" className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-surface p-5">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-plum-100 text-plum-700" aria-hidden="true">
            {items.length ? <Hourglass className="size-5" /> : <ListPlus className="size-5" />}
          </span>
          <div className="min-w-0">
            {!items.length ? (
              <>
                <p className="text-[16px] font-semibold text-neutral-900">{t("Belum ada rundown untuk acara ini")}</p>
                <p className="mt-1 text-[13.5px] leading-[21px] text-neutral-600">{staff ? t("Kegiatan akan tampil di sini setelah pengantin menyusun rundown.") : t("Susun rundown dulu; di hari H halaman ini menampilkan kegiatan yang sedang berjalan dan berikutnya.")}</p>
                {rundownHref && !staff && <a href={rundownHref} className="mt-3 inline-flex text-[13.5px] font-semibold text-plum-600 hover:underline">{t("Susun rundown")}</a>}
              </>
            ) : days !== null && days > 0 ? (
              <>
                <p className="text-[16px] font-semibold text-neutral-900">{t("Hari H belum tiba")}</p>
                <p className="mt-1 text-[13.5px] leading-[21px] text-neutral-600">{t("Mulai pukul {time} dengan {title}. Pada hari H, kegiatan yang sedang berjalan tampil di sini mengikuti jam.", { time: hhmm(items[0]!.start_time), title: items[0]!.title })}</p>
              </>
            ) : (
              <>
                <p className="text-[16px] font-semibold text-neutral-900">{t("Acara ini sudah selesai")}</p>
                <p className="mt-1 text-[13.5px] leading-[21px] text-neutral-600">{t("Rundown lengkapnya tetap bisa dilihat di bawah.")}</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className={cn("grid items-start gap-4", hasSide && "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]")}>
        <div className="flex min-w-0 flex-col gap-4">
          {/* Kehadiran */}
          {att && (
            <Card tour="harih-attendance">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-neutral-600"><Users className="size-4 text-plum-600" aria-hidden="true" />{t("Hadir di lokasi")}</p>
                  <p className="tabular mt-1 text-[28px] leading-9 font-bold text-neutral-900">{att.checkedPax}<span className="text-[16px] font-semibold text-neutral-500"> / {t("{n} pax", { n: att.expectedPax })}</span></p>
                  <p className="text-[12.5px] text-neutral-500">{t("{a} dari {b} undangan yang konfirmasi hadir", { a: att.checkedIn, b: att.invitedGuests })}</p>
                  {arrivedHref && <a href={arrivedHref} className="mt-1.5 inline-flex text-[13px] font-semibold text-plum-600 hover:underline">{t("Lihat daftar tamu hadir")}</a>}
                </div>
                {checkin && <Button size="lg" icon={<ScanLine />} onClick={checkin.open} className="w-full sm:w-auto">{t("Pindai QR")}</Button>}
              </div>
              <ProgressBar value={att.expectedPax ? Math.min(1, att.checkedPax / att.expectedPax) : 0} className="mt-3" />
            </Card>
          )}

          {/* Rundown lengkap (hanya bila ada isinya; pesan kosong sudah ada di kartu status) */}
          {items.length > 0 && (
            <Card tour="harih-timeline" className="overflow-hidden p-0 sm:p-0">
              <p className="px-4 pt-4 pb-2 text-sm font-semibold text-neutral-800 sm:px-5">{t("Rundown lengkap")}</p>
              <ol>
                {items.map((it, i) => {
                  const end = mins(it.end_time) ?? mins(items[i + 1]?.start_time ?? null) ?? mins(it.start_time)! + 30;
                  const past = (isToday && end <= now.minutes) || (days !== null && days < 0);
                  const isCur = current?.id === it.id;
                  const vendor = it.vendor_id ? vendorById[it.vendor_id] : null;
                  return (
                    <li key={it.id} className={cn("flex gap-4 border-t border-neutral-100 px-4 py-3 sm:px-5", isCur && "bg-plum-50")}>
                      <span className={cn("tabular w-[92px] shrink-0 text-[15px] font-semibold", past ? "text-neutral-500" : "text-neutral-900")}>{hhmm(it.start_time)}{it.end_time && `-${hhmm(it.end_time)}`}</span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-[15px]", past ? "font-medium text-neutral-500" : "font-semibold text-neutral-900")}>{it.title}</span>
                        {(meta(it) || vendor) && <span className={cn("block text-[12.5px]", past ? "text-neutral-500" : "text-neutral-600")}>{[meta(it), vendor?.name].filter(Boolean).join(" · ")}</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
        </div>

        {hasSide && (
          <div className="flex min-w-0 flex-col gap-4">
            {extra}

            {/* Kontak vendor */}
            {data.vendors.length > 0 && (
              <Card tour="harih-vendor" className="overflow-hidden p-0 sm:p-0">
                <p className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-semibold text-neutral-800 sm:px-5"><Store className="size-4 text-plum-600" aria-hidden="true" />{t("Kontak vendor")}</p>
                <ul>
                  {data.vendors.map((v) => (
                    <li key={v.id} className="flex items-center gap-3 border-t border-neutral-100 px-4 py-3 sm:px-5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-neutral-900">{v.name}</span>
                        <span className="block truncate text-[12.5px] text-neutral-500">{[t(v.category), v.contact_person].filter(Boolean).join(" · ")}</span>
                      </span>
                      {v.phone_e164 && <>
                        <a href={`tel:+${v.phone_e164}`} aria-label={t("Telepon {name}", { name: v.name })} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 hover:bg-plum-50"><Phone className="size-5" /></a>
                        <a href={waLink(v.phone_e164)} target="_blank" rel="noreferrer" aria-label={t("WhatsApp {name}", { name: v.name })} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 hover:bg-plum-50"><WhatsAppIcon className="size-5" /></a>
                      </>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Tugas hari H: panitia hanya melihat */}
            {data.tasks.length > 0 && (
              <Card tour="harih-tasks" className="overflow-hidden p-0 sm:p-0">
                <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
                  <p className="text-sm font-semibold text-neutral-800">{t("Tugas hari H")}</p>
                  <span className="tabular text-[12.5px] text-neutral-500">{t("{done}/{total} selesai", { done: data.tasks.filter((x) => x.status === "done").length, total: data.tasks.length })}</span>
                </div>
                <ul>
                  {data.tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={onToggleTask} />)}
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>

      <p className="pb-4 text-center text-[12px] text-neutral-500">{staff ? t("Halaman panitia · diperbarui otomatis") : t("Diperbarui otomatis setiap 30 detik")} · {loaded}</p>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: { id: string; title: string; status: string }; onToggle?: (id: string, done: boolean) => Promise<boolean | void> }) {
  const { t } = useI18n();
  const [done, setDone] = useState(task.status === "done");
  const [, start] = useTransition();
  useEffect(() => setDone(task.status === "done"), [task.status]);
  // Centang berubah seketika (di luar transisi); simpan ke server di belakang, kembalikan bila gagal
  const toggle = () => {
    if (!onToggle) return;
    const next = !done;
    setDone(next);
    start(async () => { if ((await onToggle(task.id, next)) === false) setDone(!next); });
  };
  const label = <span className={cn("text-[15px] font-medium", done ? "text-neutral-500 line-through" : "text-neutral-900")}>{t(task.title)}</span>;
  // Tanpa izin mengubah (panitia, viewer): tanda status saja, bukan tombol
  if (!onToggle) {
    return (
      <li className="flex items-center gap-3 border-t border-neutral-100 px-4 py-3 sm:px-5">
        <span className="sr-only">{done ? t("Selesai") : t("Belum")}: </span>
        <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full", done ? "bg-plum-600 text-white" : "border-2 border-neutral-300")} aria-hidden="true">
          {done && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
        </span>
        {label}
      </li>
    );
  }
  return (
    <li className="flex items-center gap-3 border-t border-neutral-100 px-4 py-3 sm:px-5">
      <button type="button" role="checkbox" aria-checked={done} aria-label={t("Tandai {title} selesai", { title: t(task.title) })}
        onClick={toggle}
        className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          done ? "border-plum-600 bg-plum-600 text-white" : "border-neutral-300 hover:border-plum-400")}>
        {done && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
      </button>
      {label}
    </li>
  );
}
