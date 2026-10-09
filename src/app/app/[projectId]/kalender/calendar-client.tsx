"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Heart, ListChecks, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { RowMenu } from "@/components/ui/menu";
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/components/ui/cn";
import { addDaysISO, formatDateLong, formatTime, isoDateInTz, todayISO } from "@/lib/format";
import { deleteAgenda } from "@/features/agenda/actions";
import { AgendaFormModal, type Agenda } from "@/features/agenda/agenda-form";
import { GoogleCalendarButton, type GoogleUiStatus } from "./google-calendar";

type FeedItem = { source: "task" | "expense_payment" | "event" | "agenda"; source_id: string; title: string; starts_at: string; ends_at: string | null; all_day: boolean; status: string | null };

const SOURCE = {
  task: { icon: <ListChecks />, label: "Tugas", cls: "bg-plum-50 text-plum-700", path: "checklist" },
  expense_payment: { icon: <Wallet />, label: "Pembayaran", cls: "bg-plum-100 text-plum-800", path: "budget" },
  event: { icon: <Heart />, label: "Acara", cls: "bg-plum-600 text-white", path: "pengaturan?tab=acara" },
  agenda: { icon: <CalendarDays />, label: "Agenda", cls: "bg-plum-200 text-plum-800", path: "kalender" },
} as const;

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function CalendarClient({ projectId, tz, feed, agenda, canWrite, google, googleFlash }: { projectId: string; tz: string; feed: FeedItem[]; agenda: Agenda[]; canWrite: boolean; google: GoogleUiStatus; googleFlash?: string }) {
  const today = todayISO(tz);
  const [view, setView] = useState<"bulan" | "minggu" | "daftar">("bulan");
  const [cursor, setCursor] = useState(today);
  const [form, setForm] = useState<{ agenda?: Agenda; date?: string } | null>(null);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setView("daftar");
  }, []);

  const byDay = useMemo(() => {
    const m = new Map<string, FeedItem[]>();
    feed.forEach((f) => {
      const k = isoDateInTz(f.starts_at, tz);
      m.set(k, [...(m.get(k) ?? []), f]);
    });
    return m;
  }, [feed, tz]);

  const y = Number(cursor.slice(0, 4)), mo = Number(cursor.slice(5, 7));
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, mo - 1, 1)));

  function weekStart(iso: string) {
    const d = new Date(iso + "T00:00:00Z");
    const dow = (d.getUTCDay() + 6) % 7;
    return addDaysISO(iso, -dow);
  }
  function shift(dir: 1 | -1) {
    if (view === "bulan") {
      const d = new Date(Date.UTC(y, mo - 1 + dir, 1));
      setCursor(d.toISOString().slice(0, 10));
    } else if (view === "minggu") setCursor(addDaysISO(cursor, 7 * dir));
    else setCursor(addDaysISO(cursor, 30 * dir));
  }

  const monthDays = useMemo(() => {
    const first = `${y}-${String(mo).padStart(2, "0")}-01`;
    const start = weekStart(first);
    return Array.from({ length: 42 }, (_, i) => addDaysISO(start, i));
  }, [y, mo]);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart(cursor), i));
  const listDays = [...byDay.keys()].filter((k) => k >= cursor).sort().slice(0, 60);

  const chip = (f: FeedItem, compact = false) => {
    const s = SOURCE[f.source];
    const done = f.status === "done" || f.status === "sudah_bayar";
    const ag = f.source === "agenda" ? agenda.find((a) => a.id === f.source_id) : null;
    const content = (
      <>
        <span className="shrink-0 [&_svg]:size-3">{s.icon}</span>
        <span className={cn("truncate", done && "line-through opacity-60")}>{!f.all_day && !compact && `${formatTime(f.starts_at, tz, false)} `}{f.title}</span>
      </>
    );
    const cls = cn("flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] font-medium", s.cls);
    return ag && canWrite ? (
      <button key={f.source + f.source_id} className={cls} onClick={() => setForm({ agenda: ag })} title={f.title}>{content}</button>
    ) : (
      <Link key={f.source + f.source_id} href={`/w/${projectId}/${s.path}`} className={cls} title={f.title}>{content}</Link>
    );
  };

  return (
    <>
      <PageHeader title="Reminder & Calendar" description="Tugas, jatuh tempo pembayaran, acara, dan agenda dalam satu kalender."
        actions={
          <>
            <GoogleCalendarButton projectId={projectId} tz={tz} status={google} flash={googleFlash} />
            {canWrite && <Button variant="dark" icon={<Plus />} onClick={() => setForm({ date: cursor })}>Tambah Agenda</Button>}
          </>
        } />

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon-sm" aria-label="Sebelumnya" onClick={() => shift(-1)}><ChevronLeft /></Button>
          <Button variant="outline" size="icon-sm" aria-label="Berikutnya" onClick={() => shift(1)}><ChevronRight /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(today)}>Hari ini</Button>
          <h2 className="ml-1 text-lg font-semibold capitalize">{view === "bulan" ? monthLabel : view === "minggu" ? `Minggu ${formatDateLong(weekDays[0]!).split(", ")[1]}` : `Mulai ${formatDateLong(cursor)}`}</h2>
          <Segmented className="ml-auto" items={[{ key: "bulan", label: "Bulan" }, { key: "minggu", label: "Minggu" }, { key: "daftar", label: "Daftar" }]} value={view} onChange={setView} />
        </div>

        <div className="mb-3 flex flex-wrap gap-3 text-xs text-neutral-600">
          {Object.values(SOURCE).map((s) => <span key={s.label} className="flex items-center gap-1.5"><span className={cn("inline-flex size-5 items-center justify-center rounded [&_svg]:size-3", s.cls)}>{s.icon}</span>{s.label}</span>)}
        </div>

        {view === "bulan" && (
          <div className="overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-7 overflow-hidden rounded-md border border-neutral-200">
              {WEEKDAYS.map((d) => <div key={d} className="bg-neutral-50 px-2 py-2 text-center text-xs font-medium text-neutral-500">{d}</div>)}
              {monthDays.map((d) => {
                const items = byDay.get(d) ?? [];
                const inMonth = Number(d.slice(5, 7)) === mo;
                return (
                  <div key={d} onDoubleClick={() => canWrite && setForm({ date: d })} className={cn("min-h-24 border-t border-l border-neutral-200 p-1.5 [&:nth-child(7n+1)]:border-l-0", !inMonth && "bg-neutral-50/60")}>
                    <span className={cn("tabular mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs", d === today ? "bg-plum-600 font-semibold text-white" : inMonth ? "text-neutral-800" : "text-neutral-500")}>{Number(d.slice(8))}</span>
                    <div className="flex flex-col gap-0.5">
                      {items.slice(0, 3).map((f) => chip(f, true))}
                      {items.length > 3 && <button className="text-left text-[11px] text-neutral-500 hover:underline" onClick={() => { setCursor(d); setView("daftar"); }}>+{items.length - 3} lagi</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "minggu" && (
          <div className="grid gap-2 md:grid-cols-7">
            {weekDays.map((d) => (
              <div key={d} className={cn("min-h-40 rounded-md border p-2", d === today ? "border-plum-400" : "border-neutral-200")}>
                <p className="mb-2 text-xs font-medium text-neutral-500">{WEEKDAYS[(new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7]} <span className="tabular text-neutral-900">{Number(d.slice(8))}</span></p>
                <div className="flex flex-col gap-1">{(byDay.get(d) ?? []).map((f) => chip(f))}</div>
              </div>
            ))}
          </div>
        )}

        {view === "daftar" && (
          <div className="flex flex-col gap-4">
            {listDays.length === 0 && <p className="py-8 text-center text-[13px] text-neutral-500">Tidak ada agenda mendatang.</p>}
            {listDays.map((d) => (
              <div key={d}>
                <p className={cn("mb-2 text-[13px] font-semibold", d === today ? "text-plum-700" : "text-neutral-700")}>{formatDateLong(d)}{d === today && " · Hari ini"}</p>
                <ul className="flex flex-col gap-2">
                  {(byDay.get(d) ?? []).map((f) => {
                    const s = SOURCE[f.source];
                    const ag = f.source === "agenda" ? agenda.find((a) => a.id === f.source_id) : null;
                    return (
                      <li key={f.source + f.source_id} className="flex items-center gap-3 rounded-md border border-neutral-200 p-3">
                        <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", s.cls)}>{s.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-medium", (f.status === "done" || f.status === "sudah_bayar") && "text-neutral-400 line-through")}>{f.title}</p>
                          <p className="text-xs text-neutral-500">{s.label} · {f.all_day ? "Sepanjang hari" : formatTime(f.starts_at, tz)}</p>
                        </div>
                        {ag && canWrite ? (
                          <RowMenu items={[
                            { label: "Ubah", icon: <Pencil />, onClick: () => setForm({ agenda: ag }) },
                            { label: "Hapus", icon: <Trash2 />, danger: true, confirm: "Hapus agenda ini?", action: () => deleteAgenda(projectId, ag.id) },
                          ]} />
                        ) : (
                          <Link href={`/w/${projectId}/${s.path}`} className="text-[13px] font-medium text-plum-600 hover:underline">Buka</Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      {form && <AgendaFormModal projectId={projectId} tz={tz} agenda={form.agenda} defaultDate={form.date} onClose={() => setForm(null)} />}
    </>
  );
}
