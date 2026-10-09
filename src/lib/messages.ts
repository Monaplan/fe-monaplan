import { formatDateLong, formatTime } from "./format";

export type EventLite = { id: string; name: string; starts_at: string | null; ends_at?: string | null; venue_name: string | null; venue_address?: string | null; maps_url?: string | null };

export function eventDetailText(events: EventLite[], tz: string): string {
  return events
    .map((e) => {
      const lines = [`*${e.name}*`];
      if (e.starts_at) lines.push(`${formatDateLong(e.starts_at, tz)}, ${formatTime(e.starts_at, tz)}`);
      if (e.venue_name) lines.push(e.venue_name);
      if (e.maps_url) lines.push(e.maps_url);
      return lines.join("\n");
    })
    .join("\n\n");
}

export function composeMessage(template: string, v: { guestName: string; coupleName: string; events: EventLite[]; link: string; tz: string }) {
  return template
    .replaceAll("{nama_tamu}", v.guestName)
    .replaceAll("{nama_pasangan}", v.coupleName)
    .replaceAll("{detail_acara}", eventDetailText(v.events, v.tz))
    .replaceAll("{link_rsvp}", v.link);
}

export const PLACEHOLDERS = ["{nama_tamu}", "{nama_pasangan}", "{detail_acara}", "{link_rsvp}"];
