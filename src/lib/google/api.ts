import "server-only";

const BASE = "https://www.googleapis.com/calendar/v3";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class CalendarApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function call(token: string, method: string, path: string, body?: unknown) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (res.status === 204) return { status: 204, json: null as any };
    const json = (await res.json().catch(() => ({}))) as any;
    const reason = json?.error?.errors?.[0]?.reason ?? "";
    const limited = res.status === 429 || (res.status === 403 && /rateLimitExceeded|userRateLimitExceeded/.test(reason));
    // Batas laju Google: tunggu dengan jeda yang bertambah, maksimal 3 kali ulang
    if (limited && attempt < 3) { await sleep(600 * 2 ** attempt + Math.random() * 300); continue; }
    return { status: res.status, json };
  }
}

const fail = (r: { status: number; json: any }): never => {
  throw new CalendarApiError(r.status, r.json?.error?.message ?? `Google Calendar membalas ${r.status}`);
};

export async function calendarExists(token: string, calendarId: string) {
  const r = await call(token, "GET", `/calendars/${encodeURIComponent(calendarId)}`);
  if (r.status === 404 || r.status === 410) return false;
  if (r.status >= 400) fail(r);
  return true;
}

export async function createCalendar(token: string, summary: string, timeZone: string, description: string) {
  const r = await call(token, "POST", "/calendars", { summary, timeZone, description });
  if (r.status >= 400) fail(r);
  return r.json.id as string;
}

// Update bila event sudah pernah dibuat, selain itu insert dengan ID deterministik.
// Event yang dihapus pengguna di Google tetap berstatus cancelled dengan ID yang sama, jadi insert bisa 409 dan dialihkan ke update.
export async function upsertEvent(token: string, calendarId: string, eventId: string, body: Record<string, unknown>, known: boolean) {
  const cal = encodeURIComponent(calendarId);
  const payload = { ...body, status: "confirmed" };
  const update = () => call(token, "PUT", `/calendars/${cal}/events/${eventId}`, { ...payload, id: eventId });
  const insert = () => call(token, "POST", `/calendars/${cal}/events`, { ...payload, id: eventId });
  let r = known ? await update() : await insert();
  if (known && r.status === 404) r = await insert();
  else if (!known && r.status === 409) r = await update();
  if (r.status >= 400) fail(r);
}

export async function deleteEvent(token: string, calendarId: string, eventId: string) {
  const r = await call(token, "DELETE", `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`);
  if (r.status >= 400 && r.status !== 404 && r.status !== 410) fail(r);
}
