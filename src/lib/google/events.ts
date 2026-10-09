// Pemetaan data Monaplan ke event Google Calendar. Murni (tanpa I/O) agar mudah diuji.
import { EVENT_TYPES, PAYMENT_KIND, labelOf } from "../constants";
import { addDaysISO, formatIDR, isoDateInTz } from "../format";

export type SourceKind = "task" | "expense_payment" | "event" | "agenda";

export type TaskRow = { id: string; title: string; description: string | null; category: string | null; priority: string; due_date: string };
export type PaymentRow = { id: string; label: string | null; kind: string; amount_idr: number; due_date: string; notes: string | null };
export type EventRow = { id: string; name: string; type: string; starts_at: string; ends_at: string | null; venue_name: string | null; venue_address: string | null; maps_url: string | null; dress_code: string | null; notes: string | null };
export type AgendaRow = { id: string; title: string; description: string | null; location: string | null; starts_at: string; ends_at: string | null; all_day: boolean; remind_offsets_minutes: number[] | null };

export type DesiredEvent = { source: SourceKind; sourceId: string; eventId: string; body: Record<string, unknown> };

const SOURCE_CODE: Record<SourceKind, string> = { task: "t", expense_payment: "p", event: "e", agenda: "a" };
const SECTION: Record<SourceKind, string> = { task: "checklist", expense_payment: "budget", event: "pengaturan?tab=acara", agenda: "kalender" };

// ID event Google: huruf a-v dan angka 0-9, huruf kecil, 5 sampai 1024 karakter
export function eventIdFor(source: SourceKind, id: string) {
  return `mp${SOURCE_CODE[source]}${id.replace(/-/g, "").toLowerCase()}`;
}

const MAX_REMINDERS = 5;
const MAX_REMINDER_MINUTES = 40_320; // batas Google: 4 minggu

function reminders(offsets: number[] | null | undefined) {
  if (!offsets || offsets.length === 0) return popup(60);
  const minutes = [...new Set(offsets.filter((m) => Number.isFinite(m) && m >= 0 && m <= MAX_REMINDER_MINUTES))].slice(0, MAX_REMINDERS);
  return { useDefault: false, overrides: minutes.map((m) => ({ method: "popup", minutes: m })) };
}

// Kalender sekunder baru tidak punya pengingat bawaan, jadi setiap jenis event membawa pengingatnya sendiri.
// Event seharian dimulai pukul 00.00: 900 menit sebelumnya = pukul 09.00 hari sebelumnya.
const popup = (...minutes: number[]) => ({ useDefault: false, overrides: minutes.map((m) => ({ method: "popup", minutes: m })) });
const REMIND = {
  task: popup(900),
  payment: popup(900, 10_080 + 900),
  event: popup(1440, 60),
};

function lines(...parts: (string | null | undefined | false)[]) {
  return parts.filter(Boolean).join("\n");
}

function base(source: SourceKind, id: string, ref: string, appBaseUrl: string, description: string, extra: Record<string, unknown>) {
  const link = `${appBaseUrl}/app/${ref}/${SECTION[source]}`;
  return {
    description: lines(description, `Buka di Monaplan: ${link}`),
    source: { title: "Monaplan", url: link },
    extendedProperties: { private: { monaplan: "1", source, sourceId: id } },
    ...extra,
  };
}

const allDay = (date: string) => ({ start: { date }, end: { date: addDaysISO(date, 1) } });

function timed(startsAt: string, endsAt: string | null, tz: string) {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 3_600_000);
  return { start: { dateTime: start.toISOString(), timeZone: tz }, end: { dateTime: end.toISOString(), timeZone: tz } };
}

export function buildDesiredEvents(
  input: { tasks: TaskRow[]; payments: PaymentRow[]; events: EventRow[]; agenda: AgendaRow[] },
  ctx: { ref: string; tz: string; appUrl: string },
): DesiredEvent[] {
  const out: DesiredEvent[] = [];
  const { ref, tz, appUrl } = ctx;

  for (const t of input.tasks) {
    out.push({
      source: "task", sourceId: t.id, eventId: eventIdFor("task", t.id),
      body: base("task", t.id, ref, appUrl, lines(t.category && `Kategori: ${t.category}`, `Prioritas: ${t.priority}`, t.description),
        { summary: `Tugas: ${t.title}`, ...allDay(t.due_date), reminders: REMIND.task }),
    });
  }
  for (const p of input.payments) {
    const kind = labelOf(PAYMENT_KIND, p.kind);
    out.push({
      source: "expense_payment", sourceId: p.id, eventId: eventIdFor("expense_payment", p.id),
      body: base("expense_payment", p.id, ref, appUrl, lines(`Nominal: ${formatIDR(p.amount_idr)}`, p.notes),
        { summary: `Bayar: ${p.label?.trim() || kind}`, ...allDay(p.due_date), reminders: REMIND.payment }),
    });
  }
  for (const e of input.events) {
    const where = [e.venue_name, e.venue_address].filter(Boolean).join(", ");
    out.push({
      source: "event", sourceId: e.id, eventId: eventIdFor("event", e.id),
      body: base("event", e.id, ref, appUrl, lines(`Jenis acara: ${labelOf(EVENT_TYPES, e.type)}`, e.dress_code && `Dress code: ${e.dress_code}`, e.maps_url && `Peta: ${e.maps_url}`, e.notes),
        { summary: e.name, ...(where && { location: where }), ...timed(e.starts_at, e.ends_at, tz), reminders: REMIND.event }),
    });
  }
  for (const a of input.agenda) {
    out.push({
      source: "agenda", sourceId: a.id, eventId: eventIdFor("agenda", a.id),
      body: base("agenda", a.id, ref, appUrl, a.description ?? "", {
        summary: a.title,
        ...(a.location && { location: a.location }),
        ...(a.all_day ? allDay(isoDateInTz(a.starts_at, tz)) : timed(a.starts_at, a.ends_at, tz)),
        reminders: reminders(a.remind_offsets_minutes),
      }),
    });
  }
  return out;
}

export type SyncPlan = { create: DesiredEvent[]; update: DesiredEvent[]; unchanged: number; remove: string[] };

// Bandingkan hasil yang diinginkan dengan tautan tersimpan (key = "source:id" → fingerprint)
export function planSync(desired: (DesiredEvent & { fingerprint: string })[], existing: Map<string, { fingerprint: string }>): SyncPlan {
  const plan: SyncPlan = { create: [], update: [], unchanged: 0, remove: [] };
  const seen = new Set<string>();
  for (const d of desired) {
    const key = `${d.source}:${d.sourceId}`;
    seen.add(key);
    const cur = existing.get(key);
    if (!cur) plan.create.push(d);
    else if (cur.fingerprint !== d.fingerprint) plan.update.push(d);
    else plan.unchanged++;
  }
  for (const key of existing.keys()) if (!seen.has(key)) plan.remove.push(key);
  return plan;
}
