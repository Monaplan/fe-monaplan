// Semua format uang, tanggal, dan nomor HP lewat helper ini (DESIGN.md bagian 10)

export const TZ_LABEL: Record<string, string> = {
  "Asia/Jakarta": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
};

export function formatIDR(value: number | null | undefined): string {
  const n = Math.round(Number(value ?? 0));
  const sign = n < 0 ? "-" : "";
  return `${sign}Rp ${Math.abs(n).toLocaleString("id-ID")}`;
}

export function formatIDRShort(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  const fmt = (x: number) => x.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (abs >= 1_000_000_000) return `Rp ${fmt(n / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `Rp ${fmt(n / 1_000_000)} jt`;
  if (abs >= 1_000) return `Rp ${fmt(n / 1_000)} rb`;
  return `Rp ${fmt(n)}`;
}

export function formatPercent(ratio: number): string {
  const p = ratio * 100;
  if (!isFinite(p)) return "0%";
  if (p > 0 && p < 10) return `${p.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
  return `${Math.round(p)}%`;
}

export function pct(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

// Tanggal tanpa jam (kolom `date`) disimpan "YYYY-MM-DD" dan diperlakukan sebagai UTC
function toDate(value: string | Date): { d: Date; isDateOnly: boolean } {
  if (value instanceof Date) return { d: value, isDateOnly: false };
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { d: new Date(value + "T00:00:00Z"), isDateOnly: true };
  return { d: new Date(value), isDateOnly: false };
}

export function formatDateShort(value: string | Date | null | undefined, tz = "Asia/Jakarta"): string {
  if (!value) return "-";
  const { d, isDateOnly } = toDate(value);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    timeZone: isDateOnly ? "UTC" : tz,
  }).format(d);
}

export function formatDateLong(value: string | Date | null | undefined, tz = "Asia/Jakarta"): string {
  if (!value) return "-";
  const { d, isDateOnly } = toDate(value);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: isDateOnly ? "UTC" : tz,
  }).format(d);
}

export function formatDateCompact(value: string | Date | null | undefined, tz = "Asia/Jakarta"): string {
  if (!value) return "-";
  const { d, isDateOnly } = toDate(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric", timeZone: isDateOnly ? "UTC" : tz,
  }).format(d);
}

export function formatTime(value: string | Date | null | undefined, tz = "Asia/Jakarta", withZone = true): string {
  if (!value) return "-";
  // kolom `time` "HH:MM:SS"
  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5).replace(":", ".");
  }
  const { d } = toDate(value);
  const t = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz })
    .format(d).replace(":", ".");
  return withZone ? `${t} ${TZ_LABEL[tz] ?? ""}`.trim() : t;
}

// "YYYY-MM-DD" hari ini di zona waktu tertentu
export function todayISO(tz = "Asia/Jakarta"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function isoDateInTz(value: string | Date, tz = "Asia/Jakarta"): string {
  const { d, isDateOnly } = toDate(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: isDateOnly ? "UTC" : tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(toISO + "T00:00:00Z") - Date.parse(fromISO + "T00:00:00Z")) / 86_400_000);
}

export function relativeDay(iso: string | null | undefined, tz = "Asia/Jakarta"): string {
  if (!iso) return "";
  const n = diffDays(todayISO(tz), iso.slice(0, 10));
  if (n === 0) return "hari ini";
  if (n === 1) return "besok";
  if (n === -1) return "kemarin";
  if (n > 1) return `${n} hari lagi`;
  return `terlambat ${-n} hari`;
}

// Gabungkan tanggal + jam lokal proyek menjadi ISO UTC
const TZ_OFFSET: Record<string, string> = {
  "Asia/Jakarta": "+07:00",
  "Asia/Makassar": "+08:00",
  "Asia/Jayapura": "+09:00",
};
export function localToISO(date: string, time: string | null | undefined, tz = "Asia/Jakarta"): string {
  const t = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : "00:00";
  return new Date(`${date}T${t}:00${TZ_OFFSET[tz] ?? "+07:00"}`).toISOString();
}
export function isoToLocalParts(value: string | null | undefined, tz = "Asia/Jakarta"): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const d = new Date(value);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return { date, time };
}

// Nomor HP: 08xx, +62, 62 menjadi 62xxxx
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  digits = digits.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  if (!digits.startsWith("62") || digits.length < 9 || digits.length > 15) return null;
  return digits;
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "-";
  const rest = e164.startsWith("62") ? e164.slice(2) : e164;
  const groups = [rest.slice(0, 3), rest.slice(3, 7), rest.slice(7)].filter(Boolean);
  return `+62 ${groups.join(" ")}`;
}

export function waLink(e164: string | null | undefined, text?: string): string {
  const base = `https://wa.me/${e164 ?? ""}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");
}

export function parseIDR(value: FormDataEntryValue | null | undefined): number {
  if (value == null) return 0;
  const n = String(value).replace(/[^\d]/g, "");
  return n ? Number(n) : 0;
}
