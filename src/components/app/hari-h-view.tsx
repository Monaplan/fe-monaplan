"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, MapPin, Phone, ScanLine, Store, Users, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/components/ui/cn";
import { formatDateLong, formatTime, isoDateInTz, waLink } from "@/lib/format";
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
export function HariHView({ data, header, onToggleTask, checkin, extra, staff }: {
  data: DayData;
  header?: ReactNode;
  onToggleTask?: (id: string, done: boolean) => Promise<void>;
  checkin?: { open: () => void } | null;
  extra?: ReactNode;
  staff?: boolean;
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {!online && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-caution-bg px-4 py-2.5 text-[13px] font-medium text-caution">
          <WifiOff className="size-4 shrink-0" />{t("Offline · data pukul {time}", { time: loaded })}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {header}
        {data.events.length > 1 && (
          <Select value={eventId} onChange={(e) => setEventId(e.target.value)} aria-label={t("Pilih acara")} className="w-auto min-w-[160px] flex-1 sm:flex-none">
            {data.events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        )}
        <span className="tabular ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-neutral-100 px-4 text-[17px] font-bold text-neutral-900">
          <Clock className="size-4 text-plum-600" />{now.clock}</span>
      </div>

      {event && (
        <p className="text-[13px] text-neutral-600">
          <b className="text-neutral-900">{event.name}</b>{event.starts_at && <> · {formatDateLong(event.starts_at, data.tz, lang)}</>}
          {event.venue_name && <> · <MapPin className="inline size-3.5 align-[-2px]" /> {event.venue_name}</>}
        </p>
      )}

      {/* Sekarang dan berikutnya */}
      <div data-tour="harih-now" className="grid gap-3 sm:grid-cols-2">
        <div className={cn("rounded-2xl p-5", current ? "bg-plum-700 text-white" : "border border-neutral-200 bg-surface")}>
          <p className={cn("text-[11px] font-bold tracking-widest uppercase", current ? "text-white/70" : "text-neutral-500")}>{t("Sekarang")}</p>
          {current ? (
            <>
              <p className="tabular mt-2 text-[20px] font-bold">{hhmm(current.start_time)}{current.end_time && ` - ${hhmm(current.end_time)}`}</p>
              <p className="mt-1 text-[24px] leading-8 font-semibold">{current.title}</p>
              <p className="mt-2 text-[14px] text-white/80">{[current.pic_name && t("PIC: {name}", { name: current.pic_name }), current.location].filter(Boolean).join(" · ")}</p>
            </>
          ) : <p className="mt-2 text-[15px] text-neutral-600">{isToday ? t("Tidak ada kegiatan yang sedang berjalan.") : t("Acara ini bukan hari ini.")}</p>}
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-surface p-5">
          <p className="text-[11px] font-bold tracking-widest text-neutral-500 uppercase">{t("Berikutnya")}</p>
          {next ? (
            <>
              <p className="tabular mt-2 text-[20px] font-bold text-neutral-900">{hhmm(next.start_time)}</p>
              <p className="mt-1 text-[20px] leading-7 font-semibold text-neutral-900">{next.title}</p>
              {(next.pic_name || next.location) && <p className="mt-2 text-[14px] text-neutral-600">{[next.pic_name && t("PIC: {name}", { name: next.pic_name }), next.location].filter(Boolean).join(" · ")}</p>}
            </>
          ) : <p className="mt-2 text-[15px] text-neutral-600">{!items.length ? t("Belum ada rundown untuk acara ini.") : current ? t("Ini kegiatan terakhir.") : isToday ? t("Semua kegiatan sudah lewat.") : t("Belum ada rundown untuk acara ini.")}</p>}
        </div>
      </div>

      {/* Kehadiran */}
      {att && (
        <Card tour="harih-attendance">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[13px] font-medium text-neutral-600"><Users className="size-4 text-plum-600" />{t("Hadir di lokasi")}</p>
              <p className="tabular mt-1 text-[28px] leading-9 font-bold text-neutral-900">{att.checkedPax}<span className="text-[16px] font-semibold text-neutral-500"> / {t("{n} pax", { n: att.expectedPax })}</span></p>
              <p className="text-[12.5px] text-neutral-500">{t("{a} dari {b} undangan yang konfirmasi hadir", { a: att.checkedIn, b: att.invitedGuests })}</p>
            </div>
            {checkin && <Button size="lg" icon={<ScanLine />} onClick={checkin.open} className="w-full sm:w-auto">{t("Pindai QR")}</Button>}
          </div>
          <ProgressBar value={att.expectedPax ? Math.min(1, att.checkedPax / att.expectedPax) : 0} className="mt-3" />
        </Card>
      )}

      {extra}

      {/* Kontak vendor */}
      {data.vendors.length > 0 && (
        <Card tour="harih-vendor" className="overflow-hidden p-0 sm:p-0">
          <p className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-semibold text-neutral-800 sm:px-5"><Store className="size-4 text-plum-600" />{t("Kontak vendor")}</p>
          <ul>
            {data.vendors.map((v) => (
              <li key={v.id} className="flex items-center gap-3 border-t border-neutral-100 px-4 py-3 sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-neutral-900">{v.name}</span>
                  <span className="block truncate text-[12.5px] text-neutral-500">{[t(v.category), v.contact_person].filter(Boolean).join(" · ")}</span>
                </span>
                {v.phone_e164 && <>
                  <a href={`tel:+${v.phone_e164}`} aria-label={t("Telepon {name}", { name: v.name })} className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 hover:bg-plum-50"><Phone className="size-5" /></a>
                  <a href={waLink(v.phone_e164)} target="_blank" rel="noreferrer" aria-label={t("WhatsApp {name}", { name: v.name })} className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 hover:bg-plum-50"><WhatsAppIcon className="size-5" /></a>
                </>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Tugas hari H */}
      {data.tasks.length > 0 && (
        <Card tour="harih-tasks" className="overflow-hidden p-0 sm:p-0">
          <p className="px-4 pt-4 pb-2 text-sm font-semibold text-neutral-800 sm:px-5">{t("Tugas hari H")}</p>
          <ul>
            {data.tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={onToggleTask} />)}
          </ul>
        </Card>
      )}

      {/* Timeline lengkap */}
      <Card tour="harih-timeline" className="overflow-hidden p-0 sm:p-0">
        <p className="px-4 pt-4 pb-2 text-sm font-semibold text-neutral-800 sm:px-5">{t("Rundown lengkap")}</p>
        {items.length === 0 ? <p className="px-5 pb-5 text-[13px] text-neutral-500">{t("Belum ada rundown untuk acara ini.")}</p> : (
          <ol>
            {items.map((it, i) => {
              const end = mins(it.end_time) ?? mins(items[i + 1]?.start_time ?? null) ?? mins(it.start_time)! + 30;
              const past = isToday && end <= now.minutes;
              const isCur = current?.id === it.id;
              const vendor = it.vendor_id ? vendorById[it.vendor_id] : null;
              return (
                <li key={it.id} className={cn("flex gap-4 border-t border-neutral-100 px-4 py-3 sm:px-5", isCur && "bg-plum-50")}>
                  <span className={cn("tabular w-[92px] shrink-0 text-[15px] font-semibold", past ? "text-neutral-500" : "text-neutral-900")}>{hhmm(it.start_time)}{it.end_time && `-${hhmm(it.end_time)}`}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[15px] font-semibold", past ? "text-neutral-500 font-medium" : "text-neutral-900")}>{it.title}</span>
                    <span className={cn("block text-[12.5px]", past ? "text-neutral-500" : "text-neutral-600")}>{[it.pic_name && t("PIC: {name}", { name: it.pic_name }), it.location, vendor?.name].filter(Boolean).join(" · ")}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <p className="pb-4 text-center text-[12px] text-neutral-500">{staff ? t("Halaman panitia · diperbarui otomatis") : t("Diperbarui otomatis setiap 30 detik")} · {loaded}</p>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: { id: string; title: string; status: string }; onToggle?: (id: string, done: boolean) => Promise<void> }) {
  const { t } = useI18n();
  const [done, setDone] = useState(task.status === "done");
  const [pending, start] = useTransition();
  useEffect(() => setDone(task.status === "done"), [task.status]);
  return (
    <li className="flex items-center gap-3 border-t border-neutral-100 px-4 py-3 sm:px-5">
      <button type="button" role="checkbox" aria-checked={done} disabled={!onToggle || pending} aria-label={t("Tandai {title} selesai", { title: t(task.title) })}
        onClick={() => onToggle && start(async () => { setDone(!done); await onToggle(task.id, !done); })}
        className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:cursor-default",
          done ? "border-plum-600 bg-plum-600 text-white" : "border-neutral-300 hover:border-plum-400")}>
        {done && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
      </button>
      <span className={cn("text-[15px] font-medium", done ? "text-neutral-500 line-through" : "text-neutral-900")}>{t(task.title)}</span>
    </li>
  );
}
