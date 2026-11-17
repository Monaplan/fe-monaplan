import type { CSSProperties, ReactNode } from "react";
import { CalendarHeart, Clock, MapPin, Shirt } from "lucide-react";
import { resolveRsvpTheme, type RsvpTheme } from "@/content/rsvp-themes";
import { formatDateLong, formatTime } from "@/lib/format";
import { Corners, Divider } from "./ornaments";
import { Countdown, InviteShell, ScrollHint } from "./invite-client";
import { balinese, playfair, script } from "./fonts";
import { safeHref } from "@/lib/url";
import "./invite.css";

export type RsvpEvent = {
  id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  venue_address: string | null;
  maps_url: string | null;
  dress_code: string | null;
};

export type RsvpPartner = { full: string; short: string };

const firstWord = (s: string) => s.trim().split(/\s+/)[0] ?? s;
export const partnerOf = (full: string, nickname?: string | null): RsvpPartner => ({ full: full.trim(), short: (nickname?.trim() || firstWord(full)) });

// Jeda animasi lewat variabel --d (dipakai .rv-i, .rv-h, dan [data-reveal])
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

// Kelopak/debu melayang: nilai acak semu tetap agar HTML server selalu sama
const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const r = (n: number) => (((i + 1) * 9301 + n * 49297) % 233280) / 233280;
  return { x: Math.round(r(1) * 96), s: 9 + Math.round(r(2) * 9), t: 12 + Math.round(r(3) * 10), dl: -Math.round(r(4) * 20), dx: Math.round((r(5) - 0.5) * 140), o: 0.3 + r(6) * 0.35, rot: 180 + Math.round(r(7) * 360) };
});

function dateParts(iso: string, tz: string) {
  const at = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", { timeZone: tz, ...o }).format(at);
  return { weekday: f({ weekday: "long" }), day: f({ day: "2-digit" }), month: f({ month: "long" }), year: f({ year: "numeric" }) };
}

// Tautan "Simpan ke Kalender" (Google Calendar); acara tanpa jam selesai dianggap dua jam
function calendarUrl(e: RsvpEvent, title: string) {
  const start = Date.parse(e.starts_at!);
  const end = e.ends_at ? Date.parse(e.ends_at) : start + 2 * 3_600_000;
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${stamp(start)}/${stamp(end)}` });
  const where = [e.venue_name, e.venue_address].filter(Boolean).join(", ");
  if (where) q.set("location", where);
  return `https://calendar.google.com/calendar/render?${q}`;
}

// Satu tampilan untuk undangan asli dan halaman contoh: sampul pembuka, sampul isi, kutipan, mempelai, hitung mundur,
// acara, konfirmasi, dan penutup. Konten sama, hanya tema yang berganti.
export function RsvpView({ themeId, partners, guestName, cover, coverAlt, events, tz, children }: {
  themeId: string | null | undefined;
  partners: [RsvpPartner, RsvpPartner];
  guestName: string | null;
  cover: string | null;
  coverAlt: string;
  events: RsvpEvent[];
  tz: string;
  children: ReactNode;
}) {
  const theme = resolveRsvpTheme(themeId);
  const [one, two] = partners;
  const first = events.find((e) => e.starts_at);
  const heading = "font-[family-name:var(--rv-font)]";
  const eyebrow = "text-[11px] font-semibold tracking-[0.28em] text-[var(--rv-accent)] uppercase";
  const nameCls = "font-[family-name:var(--rv-name-font)] text-[length:var(--rv-name-size)] leading-[1.08] font-normal tracking-[var(--rv-title-track)] [text-transform:var(--rv-title-case)] [overflow-wrap:anywhere]";
  const coupleTitle = `Pernikahan ${one.short} & ${two.short}`;

  const names = (
    <>
      {one.short}
      <span className={`${heading} rv-amp my-1 block text-[30px] leading-9 text-[var(--rv-accent)] normal-case italic`}>&amp;</span>
      {two.short}
    </>
  );

  // Sampul pembuka (menutup halaman sampai dibuka)
  const gate = (
    <>
      <div className="rv-draw"><Corners kind={theme.ornament} /></div>
      {theme.greeting && <div className="rv-i" style={d(150)}><Salam text={theme.greeting.open} /></div>}
      <div className="rv-i" style={d(250)}><Monogram a={one.short} b={two.short} /></div>
      <p className={`${eyebrow} rv-i mt-6`} style={d(500)}>The Wedding of</p>
      <p className={`${nameCls} rv-i rv-shine mt-4`} style={d(700)}>{names}</p>
      <div className="rv-i w-full" style={d(950)}><Divider kind={theme.ornament} /></div>
      {first?.starts_at && <p className={`${heading} rv-i text-[18px] tracking-wide`} style={d(1050)}>{formatDateLong(first.starts_at, tz)}</p>}
      <div className="rv-i mt-8 w-full max-w-[300px] border-y border-[var(--rv-card-border)] py-4" style={d(1250)}>
        <p className="text-[11px] tracking-[0.22em] text-[var(--rv-muted)] uppercase">Kepada Yth.</p>
        <p className={`${heading} mt-1.5 text-[24px] leading-8 font-medium [overflow-wrap:anywhere]`}>{guestName ?? "Bapak/Ibu/Saudara/i"}</p>
        <p className="mt-1 text-[11px] text-[var(--rv-muted)]">di tempat</p>
      </div>
    </>
  );

  return (
    <InviteShell style={theme.vars as CSSProperties} themeId={theme.id} gate={gate}
      className={`${playfair.variable} ${balinese.variable} ${script.variable} rv-root min-h-dvh bg-[var(--rv-outer)] text-[var(--rv-ink)] md:py-6`}>
      <Particles theme={theme} />
      <div className="relative mx-auto max-w-[480px] overflow-hidden bg-[var(--rv-bg)] md:shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        {/* Sampul isi */}
        <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-9 pt-20 pb-28 text-center [background-image:var(--rv-bg-image)]">
          <span aria-hidden="true" className="rv-halo pointer-events-none absolute inset-x-0 top-[8%] mx-auto size-[440px] rounded-full bg-[radial-gradient(circle,var(--rv-soft)_0%,transparent_68%)]" />
          <Corners kind={theme.ornament} />
          <div className="relative flex w-full flex-col items-center">
            <p className={`${eyebrow} rv-h`} style={d(150)}>The Wedding of</p>
            {cover ? (
              <div className="rv-h relative mt-8 w-52" style={d(300)}>
                <span aria-hidden="true" className="absolute -inset-3 border border-[var(--rv-accent)] opacity-40 [border-radius:var(--rv-photo-radius)]" />
                <div className="relative aspect-[3/4] border border-[var(--rv-card-border)] bg-[var(--rv-card)] p-1.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] [border-radius:var(--rv-photo-radius)]">
                  <div className="size-full overflow-hidden [border-radius:var(--rv-photo-radius)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt={coverAlt} className="rv-kb size-full object-cover" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rv-h mt-7" style={d(300)}><Monogram a={one.short} b={two.short} big /></div>
            )}
            <h1 className={`${nameCls} rv-h rv-shine mt-8`} style={d(550)}>{names}</h1>
            <div className="rv-h w-full" style={d(800)}><Divider kind={theme.ornament} /></div>
            {first?.starts_at && <p className={`${heading} rv-h text-[19px] tracking-wide`} style={d(900)}>{formatDateLong(first.starts_at, tz)}</p>}
          </div>
          <div className="rv-h absolute inset-x-0 bottom-8 flex justify-center" style={d(1300)}><ScrollHint label="Gulir ke isi undangan" /></div>
        </section>

        <div id="isi" className="scroll-mt-0" />

        {/* Kutipan */}
        <section className="relative bg-[var(--rv-bg-2)] px-10 py-20 text-center">
          <span aria-hidden="true" data-reveal="zoom" className={`${heading} block text-[72px] leading-[0.6] text-[var(--rv-accent)] opacity-60`}>&ldquo;</span>
          <blockquote data-reveal="up" style={d(150)} className={`${heading} mx-auto mt-4 max-w-sm text-[21px] leading-[1.55] font-medium italic`}>
            Cinta tidak terdiri dari saling memandang, tetapi bersama-sama memandang ke arah yang sama.
          </blockquote>
          <p data-reveal="up" style={d(300)} className="mt-5 text-[11px] font-semibold tracking-[0.22em] text-[var(--rv-muted)] uppercase">Antoine de Saint-Exupéry</p>
        </section>

        {/* Mempelai */}
        <section className="relative px-8 py-20 text-center">
          <SectionHead eyebrow="Dengan penuh syukur" title="Mempelai" theme={theme} />
          <p data-reveal="up" style={d(200)} className="mx-auto mt-2 max-w-sm text-[15px] leading-7 text-[var(--rv-muted)]">Kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu di hari bahagia kami.</p>
          <div className="mt-12 flex flex-col items-center gap-6">
            <Person p={one} from="left" heading={heading} />
            <span aria-hidden="true" data-reveal="zoom" className="font-[family-name:var(--font-script)] text-[64px] leading-none text-[var(--rv-accent)]">&amp;</span>
            <Person p={two} from="right" heading={heading} />
          </div>
        </section>

        {/* Hitung mundur */}
        {first?.starts_at && (
          <section className="relative overflow-hidden bg-[var(--rv-bg-2)] px-7 py-20 text-center [background-image:var(--rv-bg-image)]">
            <SectionHead eyebrow="Save the date" title="Menuju hari bahagia" theme={theme} />
            <p data-reveal="up" style={d(200)} className={`${heading} text-[18px] tracking-wide text-[var(--rv-muted)]`}>{formatDateLong(first.starts_at, tz)}</p>
            <div data-reveal="up" style={d(320)} className="mt-7">
              <Countdown target={first.starts_at} title="Hitung mundur" labels={["Hari", "Jam", "Menit", "Detik"]} doneText="Hari bahagia telah tiba" />
            </div>
            <a data-reveal="up" style={d(440)} href={calendarUrl(first, coupleTitle)} target="_blank" rel="noreferrer"
              className="mt-8 inline-flex h-11 items-center gap-2 border border-[var(--rv-accent)] px-6 text-[12px] font-semibold tracking-[0.14em] text-[var(--rv-accent)] uppercase transition-colors [border-radius:var(--rv-radius)] hover:bg-[var(--rv-accent)] hover:text-[var(--rv-accent-ink)]">
              <CalendarHeart className="size-4" aria-hidden="true" />Simpan ke Kalender
            </a>
          </section>
        )}

        {/* Acara */}
        {events.length > 0 && (
          <section className="relative px-6 py-20">
            <SectionHead eyebrow="Rangkaian Acara" title="Waktu & Tempat" theme={theme} />
            <div className="mt-4 flex flex-col gap-6">
              {events.map((e, i) => {
                const p = e.starts_at ? dateParts(e.starts_at, tz) : null;
                return (
                  <article key={e.id} data-reveal="up" style={d(i * 140)}
                    className="rv-card relative overflow-hidden border border-[var(--rv-card-border)] bg-[var(--rv-card)] px-6 pt-9 pb-8 text-center shadow-[0_20px_40px_-28px_rgba(0,0,0,0.35)] [border-radius:var(--rv-radius)]">
                    <span aria-hidden="true" className="pointer-events-none absolute inset-2 border border-[var(--rv-card-border)] opacity-60 [border-radius:var(--rv-radius)]" />
                    <h2 className={`${heading} relative text-[32px] leading-10 font-medium text-[var(--rv-accent)]`}>{e.name}</h2>
                    {p && (
                      <div className="relative mx-auto mt-5 grid max-w-[300px] grid-cols-[1fr_auto_1fr] items-center gap-4">
                        <span className="border-y border-[var(--rv-card-border)] py-2 text-[12px] font-semibold tracking-[0.16em] uppercase">{p.weekday}</span>
                        <span className={`${heading} text-[54px] leading-none font-medium text-[var(--rv-accent)] [font-variant-numeric:lining-nums]`}>{p.day}</span>
                        <span className="border-y border-[var(--rv-card-border)] py-2 text-[12px] font-semibold tracking-[0.16em] uppercase">{p.month}<span className="block text-[11px] font-medium tracking-[0.2em] text-[var(--rv-muted)]">{p.year}</span></span>
                      </div>
                    )}
                    <ul className="relative mt-6 space-y-2.5 text-[14.5px]">
                      {e.starts_at && <li className="flex items-center justify-center gap-2"><Clock className="size-4 shrink-0 text-[var(--rv-accent)]" />{formatTime(e.starts_at, tz)}{e.ends_at && ` sampai ${formatTime(e.ends_at, tz)}`}</li>}
                      {(e.venue_name || e.venue_address) && (
                        <li className="flex items-start justify-center gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-[var(--rv-accent)]" /><span><span className="font-semibold">{e.venue_name}</span>{e.venue_address && <span className="block text-[13px] text-[var(--rv-muted)]">{e.venue_address}</span>}</span></li>
                      )}
                      {e.dress_code && <li className="flex items-center justify-center gap-2"><Shirt className="size-4 shrink-0 text-[var(--rv-accent)]" />Dress code: {e.dress_code}</li>}
                    </ul>
                    {safeHref(e.maps_url) && (
                      <a href={safeHref(e.maps_url)} target="_blank" rel="noreferrer" className="relative mt-6 inline-flex h-11 items-center gap-2 bg-[var(--rv-accent)] px-6 text-[12px] font-semibold tracking-[0.14em] text-[var(--rv-accent-ink)] uppercase transition-[filter,transform] [border-radius:var(--rv-radius)] hover:brightness-110 active:scale-[0.97]">
                        <MapPin className="size-4" />Petunjuk Lokasi
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Konfirmasi */}
        <section id="rsvp" className="relative bg-[var(--rv-bg-2)] px-6 py-20">
          <SectionHead eyebrow="Konfirmasi Kehadiran" title="Sampai jumpa di hari bahagia kami" theme={theme} />
          <div data-reveal="up" style={d(200)} className="mt-3 border border-[var(--rv-card-border)] bg-[var(--rv-card)] p-5 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.35)] [border-radius:var(--rv-radius)]">{children}</div>
        </section>

        {/* Penutup */}
        <section className="relative overflow-hidden px-9 pt-20 pb-14 text-center [background-image:var(--rv-bg-image)]">
          <Corners kind={theme.ornament} />
          <div className="relative">
            {theme.greeting && <div data-reveal="up"><Salam text={theme.greeting.close} /></div>}
            <p data-reveal="up" style={d(100)} className="mx-auto max-w-xs text-[15px] leading-7 text-[var(--rv-muted)]">Merupakan kebahagiaan dan kehormatan bagi kami bila Bapak/Ibu/Saudara/i berkenan hadir. Terima kasih atas doa dan restunya.</p>
            <p data-reveal="up" style={d(220)} className="mt-8 text-[11px] font-semibold tracking-[0.24em] text-[var(--rv-muted)] uppercase">Kami yang berbahagia</p>
            <p data-reveal="zoom" style={d(340)} className={`${nameCls} rv-shine mt-3 text-[length:calc(var(--rv-name-size)*0.7)]`}>{one.short} &amp; {two.short}</p>
            <div data-reveal="up" style={d(460)}><Divider kind={theme.ornament} /></div>
            <p className="mt-12 text-[11px] text-[var(--rv-muted)]">Dibuat dengan Monaplan</p>
          </div>
        </section>
      </div>
    </InviteShell>
  );
}

// Judul bagian: label kecil, judul, dan pembatas bertema
function SectionHead({ eyebrow, title, theme }: { eyebrow: string; title: string; theme: RsvpTheme }) {
  return (
    <div className="text-center">
      <p data-reveal="up" className="text-[11px] font-semibold tracking-[0.28em] text-[var(--rv-accent)] uppercase">{eyebrow}</p>
      <h2 data-reveal="up" style={d(100)} className="mt-3 font-[family-name:var(--rv-font)] text-[34px] leading-[1.15] font-medium">{title}</h2>
      <div data-reveal="fade" style={d(180)}><Divider kind={theme.ornament} /></div>
    </div>
  );
}

// Inisial mempelai dalam lingkaran dengan cincin putus-putus yang berputar pelan
function Monogram({ a, b, big }: { a: string; b: string; big?: boolean }) {
  return (
    <span aria-hidden="true" className={`relative inline-flex items-center justify-center text-[var(--rv-accent)] ${big ? "size-[150px]" : "size-[104px]"}`}>
      <svg viewBox="0 0 100 100" className="rv-spin absolute inset-0 size-full" fill="none" stroke="currentColor">
        <circle cx="50" cy="50" r="48" strokeWidth="0.6" strokeDasharray="1.5 3" />
        <circle cx="50" cy="50" r="43" strokeWidth="0.8" opacity="0.7" />
      </svg>
      <span className={`font-[family-name:var(--rv-font)] leading-none font-medium tracking-wider ${big ? "text-[44px]" : "text-[32px]"}`}>
        {a.charAt(0).toUpperCase()}<span className={`mx-1 italic ${big ? "text-[26px]" : "text-[19px]"}`}>&amp;</span>{b.charAt(0).toUpperCase()}
      </span>
    </span>
  );
}

// Satu mempelai: bingkai lengkung dengan inisial besar, lalu nama lengkap
function Person({ p, from, heading }: { p: RsvpPartner; from: "left" | "right"; heading: string }) {
  return (
    <div data-reveal={from} className="flex flex-col items-center">
      <span aria-hidden="true" className="relative flex h-[150px] w-[118px] items-center justify-center border border-[var(--rv-card-border)] bg-[var(--rv-card)] [border-radius:var(--rv-photo-radius)]">
        <span className="absolute inset-1.5 border border-[var(--rv-accent)] opacity-35 [border-radius:var(--rv-photo-radius)]" />
        <span className="font-[family-name:var(--rv-name-font)] text-[64px] leading-none text-[var(--rv-accent)]">{p.short.charAt(0).toUpperCase()}</span>
      </span>
      <p className={`${heading} mt-5 text-[30px] leading-9 font-medium tracking-[var(--rv-title-track)] [text-transform:var(--rv-title-case)] [overflow-wrap:anywhere]`}>{p.full}</p>
      {p.short !== p.full && <p className="mt-1 text-[12px] tracking-[0.18em] text-[var(--rv-muted)] uppercase">{p.short}</p>}
    </div>
  );
}

// Lapisan kelopak atau debu emas yang melayang di atas seluruh halaman (dimatikan bila gerak dikurangi)
function Particles({ theme }: { theme: RsvpTheme }) {
  const dust = theme.particles === "dust";
  return (
    <div aria-hidden="true" className="rv-particles" data-kind={theme.particles}>
      {PARTICLES.map((p, i) => (
        <span key={i} className="rv-p" style={{
          "--x": `${p.x}%`, "--s": `${dust ? 2 + (p.s % 4) : p.s}px`, "--t": `${dust ? p.t + 4 : p.t}s`, "--dl": `${p.dl}s`,
          "--dx": `${p.dx}px`, "--o": p.o.toFixed(2), "--r": `${p.rot}deg`,
        } as CSSProperties} />
      ))}
    </div>
  );
}

// Salam beraksara: aksara di atas, tulisan Latin di bawahnya agar tetap terbaca bila huruf aksara gagal dimuat
function Salam({ text }: { text: { script: string; latin: string } }) {
  return (
    <div className="mb-6 text-center">
      <p lang="ban" className="font-[family-name:var(--font-balinese)] text-[22px] leading-[1.7] text-[var(--rv-accent)]">{text.script}</p>
      <p className="mt-0.5 font-[family-name:var(--rv-font)] text-[17px] text-[var(--rv-ink)] italic">{text.latin}</p>
    </div>
  );
}
