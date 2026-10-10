import Link from "next/link";
import { CalendarHeart, Heart, MapPin } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { diffDays, formatDateLong, isoDateInTz } from "@/lib/format";
import { getI18n } from "@/i18n/server";

const RING = 2 * Math.PI * 54;

// Panel hitung mundur hari H: cincin progres (dari proyek dibuat sampai hari H), angka besar, dan rincian bulan, minggu, hari
export async function CountdownHero({ weddingDate, createdAt, today, tz, place, settingsHref }: {
  weddingDate: string | null;
  createdAt: string;
  today: string;
  tz: string;
  place: string | null;
  settingsHref: string;
}) {
  const { t, lang } = await getI18n();
  const shell = "brand-canvas relative overflow-hidden rounded-2xl p-5 text-white";
  const deco = (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full border border-white/10" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -bottom-24 size-48 rounded-full border border-white/10" />
    </>
  );

  if (!weddingDate) {
    return (
      <div className={shell}>
        {deco}
        <p className="relative text-[11px] font-semibold tracking-[0.16em] text-[#EDD1DF] uppercase">{t("Hitung Mundur")}</p>
        <p className="relative mt-3 font-display text-[28px] leading-8 font-medium">{t("Kapan hari bahagiamu?")}</p>
        <p className="relative mt-1.5 text-[13px] leading-5 text-white/80">{t("Tanggal pernikahan belum diisi.")}</p>
        <Link href={settingsHref} className="relative mt-4 inline-flex h-10 items-center rounded-full bg-white px-5 text-[13px] font-semibold text-plum-700 transition-transform hover:-translate-y-px">{t("Atur sekarang")}</Link>
      </div>
    );
  }

  const daysLeft = diffDays(today, weddingDate);
  const started = isoDateInTz(createdAt, tz);
  const total = Math.max(1, diffDays(started, weddingDate));
  const ratio = daysLeft <= 0 ? 1 : Math.min(1, Math.max(0.02, diffDays(started, today) / total));
  const offset = RING * (1 - ratio);
  const months = Math.floor(daysLeft / 30), weeks = Math.floor((daysLeft % 30) / 7), days = (daysLeft % 30) % 7;
  const done = daysLeft <= 0;

  return (
    <div className={shell}>
      {deco}
      <div className="relative flex items-center gap-5">
        <div className="relative size-[132px] shrink-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="6" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="#F3C8DB" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={RING} strokeDashoffset={offset} className="animate-ring" style={{ ["--ring-from" as string]: RING }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {done ? (
              <>
                <Heart className="size-7 fill-[#F3C8DB] text-[#F3C8DB]" />
                <span className="mt-1 text-[12px] leading-4 font-semibold">{daysLeft === 0 ? t("Hari ini!") : t("Selamat menikah")}</span>
              </>
            ) : (
              <>
                <span className="font-display text-[44px] leading-[44px] font-medium [font-variant-numeric:lining-nums]"><CountUp value={daysLeft} /></span>
                <span className="mt-0.5 text-[11px] font-medium tracking-wide text-[#EDD1DF] uppercase">{t("hari lagi")}</span>
              </>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#EDD1DF] uppercase">{t("Hitung Mundur")}</p>
          <p className="mt-1.5 flex items-start gap-1.5 text-[14px] leading-5 font-medium"><CalendarHeart className="mt-0.5 size-4 shrink-0 text-[#F3C8DB]" />{formatDateLong(weddingDate, undefined, lang)}</p>
          {place && <p className="mt-1 flex items-start gap-1.5 text-[13px] leading-5 text-white/75"><MapPin className="mt-0.5 size-4 shrink-0" /><span className="min-w-0 [overflow-wrap:anywhere]">{place}</span></p>}
        </div>
      </div>
      {!done && (
        <dl className="relative mt-5 grid grid-cols-3 gap-2">
          {[[months, t("bulan")], [weeks, t("minggu")], [days, t("hari")]].map(([n, label]) => (
            <div key={label as string} className="rounded-xl bg-white/10 px-3 py-2.5 text-center ring-1 ring-white/10">
              <dt className="sr-only">{label}</dt>
              <dd className="font-display text-[26px] leading-7 font-medium [font-variant-numeric:lining-nums]">{n}</dd>
              <dd className="text-[11px] text-white/70">{label}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
