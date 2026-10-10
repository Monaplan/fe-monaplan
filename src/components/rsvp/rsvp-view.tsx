import type { CSSProperties, ReactNode } from "react";
import { CalendarDays, Clock, MapPin, Shirt } from "lucide-react";
import { resolveRsvpTheme } from "@/content/rsvp-themes";
import { formatDateLong, formatTime } from "@/lib/format";
import { Corners, Divider } from "./ornaments";
import { Countdown, OpenButton } from "./invite-client";
import { balinese, playfair, script } from "./fonts";

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

// Satu tampilan untuk undangan asli dan halaman contoh: sampul penuh layar, lalu bagian mempelai, hitung mundur,
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
  const style = { ...theme.vars } as CSSProperties;
  const [one, two] = partners;
  const first = events.find((e) => e.starts_at);
  const heading = "font-[family-name:var(--rv-font)]";
  const eyebrow = "text-[11px] font-semibold tracking-[0.24em] text-[var(--rv-accent)] uppercase";
  const nameCls = "font-[family-name:var(--rv-name-font)] text-[length:var(--rv-name-size)] leading-[1.08] font-normal tracking-[var(--rv-title-track)] [text-transform:var(--rv-title-case)] [overflow-wrap:anywhere]";

  return (
    <main style={style} data-rsvp-theme={theme.id} className={`${playfair.variable} ${balinese.variable} ${script.variable} min-h-dvh bg-[var(--rv-outer)] text-[var(--rv-ink)] md:py-6`}>
      <div className="mx-auto max-w-[480px] overflow-hidden bg-[var(--rv-bg)] md:shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        {/* Sampul */}
        <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-9 py-20 text-center [background-image:var(--rv-bg-image)]">
          <Corners kind={theme.ornament} />
          <div className="relative flex flex-col items-center">
            {theme.greeting && <Salam text={theme.greeting.open} />}
            {!cover && (
              <span aria-hidden="true" className={`${heading} mb-1 inline-flex size-[84px] items-center justify-center rounded-full border border-[var(--rv-accent)] text-[30px] leading-none tracking-wider text-[var(--rv-accent)]`}>
                {one.short.charAt(0).toUpperCase()}<span className="mx-0.5 text-[18px] italic">&amp;</span>{two.short.charAt(0).toUpperCase()}
              </span>
            )}
            <p className={`${eyebrow} mt-4`}>The Wedding of</p>
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={coverAlt} className="mt-6 aspect-[3/4] w-48 border border-[var(--rv-card-border)] object-cover p-1.5 [background:var(--rv-card)] [border-radius:var(--rv-photo-radius)]" />
            )}
            <h1 className={`${nameCls} mt-6`}>
              {one.short}
              <span className={`${heading} my-1 block text-[28px] leading-8 text-[var(--rv-accent)] normal-case italic`}>&amp;</span>
              {two.short}
            </h1>
            <Divider kind={theme.ornament} />
            {first?.starts_at && <p className={`${heading} text-[19px] tracking-wide`}>{formatDateLong(first.starts_at, tz)}</p>}
            <p className="mt-7 text-[12px] tracking-[0.18em] text-[var(--rv-muted)] uppercase">Kepada Yth.</p>
            <p className={`${heading} mt-1.5 text-[24px] leading-8 font-medium [overflow-wrap:anywhere]`}>{guestName ?? "Bapak/Ibu/Saudara/i"}</p>
            <OpenButton label="Buka Undangan" />
          </div>
        </section>

        <div id="isi" className="scroll-mt-0" />

        {/* Mempelai */}
        <section className="reveal bg-[var(--rv-bg-2)] px-9 py-16 text-center">
          <p className={eyebrow}>Dengan penuh syukur</p>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-7 text-[var(--rv-muted)]">Kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu di hari bahagia kami.</p>
          <div className="mt-9 flex flex-col items-center gap-2">
            <p className={`${heading} text-[32px] leading-10 font-medium tracking-[var(--rv-title-track)] [text-transform:var(--rv-title-case)] [overflow-wrap:anywhere]`}>{one.full}</p>
            <span aria-hidden="true" className={`${heading} text-[28px] text-[var(--rv-accent)] italic`}>&amp;</span>
            <p className={`${heading} text-[32px] leading-10 font-medium tracking-[var(--rv-title-track)] [text-transform:var(--rv-title-case)] [overflow-wrap:anywhere]`}>{two.full}</p>
          </div>
        </section>

        {/* Hitung mundur */}
        {first?.starts_at && (
          <section className="reveal px-7 py-14 text-center">
            <p className={eyebrow}>Menuju hari bahagia</p>
            <div className="mt-6"><Countdown target={first.starts_at} title="Hitung mundur" labels={["Hari", "Jam", "Menit", "Detik"]} /></div>
          </section>
        )}

        {/* Acara */}
        {events.length > 0 && (
          <section className="reveal bg-[var(--rv-bg-2)] px-7 py-16">
            <p className={`${eyebrow} text-center`}>Rangkaian Acara</p>
            <div className="mt-7 flex flex-col gap-5">
              {events.map((e) => (
                <article key={e.id} className="border border-[var(--rv-card-border)] bg-[var(--rv-card)] px-6 py-7 text-center [border-radius:var(--rv-radius)]">
                  <h2 className={`${heading} text-[30px] leading-9 font-medium text-[var(--rv-accent)]`}>{e.name}</h2>
                  <ul className="mt-4 space-y-2.5 text-[14.5px]">
                    {e.starts_at && <li className="flex items-center justify-center gap-2"><CalendarDays className="size-4 shrink-0 text-[var(--rv-accent)]" />{formatDateLong(e.starts_at, tz)}</li>}
                    {e.starts_at && <li className="flex items-center justify-center gap-2"><Clock className="size-4 shrink-0 text-[var(--rv-accent)]" />{formatTime(e.starts_at, tz)}{e.ends_at && ` sampai ${formatTime(e.ends_at, tz)}`}</li>}
                    {(e.venue_name || e.venue_address) && (
                      <li className="flex items-start justify-center gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-[var(--rv-accent)]" /><span>{e.venue_name}{e.venue_address && <span className="block text-[13px] text-[var(--rv-muted)]">{e.venue_address}</span>}</span></li>
                    )}
                    {e.dress_code && <li className="flex items-center justify-center gap-2"><Shirt className="size-4 shrink-0 text-[var(--rv-accent)]" />Dress code: {e.dress_code}</li>}
                  </ul>
                  {e.maps_url && (
                    <a href={e.maps_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-10 items-center gap-2 border border-[var(--rv-accent)] px-5 text-[13px] font-semibold text-[var(--rv-accent)] transition-colors [border-radius:var(--rv-radius)] hover:bg-[var(--rv-accent)] hover:text-[var(--rv-accent-ink)]">
                      <MapPin className="size-4" />Buka Maps
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Konfirmasi */}
        <section id="rsvp" className="reveal px-7 py-16">
          <p className={`${eyebrow} text-center`}>Konfirmasi Kehadiran</p>
          <h2 className={`${heading} mt-2 text-center text-[30px] leading-9 font-medium`}>Sampai jumpa di hari bahagia kami</h2>
          <div className="mt-7 border border-[var(--rv-card-border)] bg-[var(--rv-card)] p-5 [border-radius:var(--rv-radius)]">{children}</div>
        </section>

        {/* Penutup */}
        <section className="reveal bg-[var(--rv-bg-2)] px-9 py-14 text-center">
          {theme.greeting && <Salam text={theme.greeting.close} />}
          <p className="mx-auto max-w-xs text-[14px] leading-6 text-[var(--rv-muted)]">Merupakan kebahagiaan dan kehormatan bagi kami bila Bapak/Ibu/Saudara/i berkenan hadir. Terima kasih atas doa dan restunya.</p>
          <p className={`${nameCls} mt-6 text-[length:calc(var(--rv-name-size)*0.6)]`}>{one.short} &amp; {two.short}</p>
          <p className="mt-10 text-[11px] text-[var(--rv-muted)]">Dibuat dengan Monaplan</p>
        </section>
      </div>
    </main>
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
