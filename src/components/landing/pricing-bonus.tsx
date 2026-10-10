import { ArrowRight, BellRing, Check, CircleCheck, LayoutGrid, Palette, Plane, Printer, ShieldCheck, Tag, Users, Briefcase } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { ButtonLink } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { formatDateCompact, formatIDR } from "@/lib/format";
import { BONUSES, BONUS_TOTAL } from "@/content/bonus";
import { getI18n } from "@/i18n/server";

export type PricedPlan = {
  id: string; name: string; max_collaborators: number; storage_quota_mb: number; max_projects: number;
  original: number; final: number; promo: { name: string; ends_at: string | null } | null;
};

const COLORS = ["#8C3A63", "#D9A5B8", "#F1E4D0", "#6F8F72", "#3E1A2D"];

// Harga dan bonus dalam satu bagian. Satu paket: isi paket dan dua tiket bonus di kiri, nota nilai dengan tombol bayar di kanan.
// Lebih dari satu paket: kartu per paket ("Pilih paket ini"), lalu tiket bonus di bawahnya.
export async function PricingBonus({ plans, trialDays, loggedIn, buyHref }: { plans: PricedPlan[]; trialDays: number | null; loggedIn: boolean; buyHref: string }) {
  const { t, lang } = await getI18n();
  const single = plans.length === 1;

  const points = (p: PricedPlan) => [
    { icon: <LayoutGrid />, text: t("11 modul lengkap, dari checklist dan budget sampai rundown hari H") },
    { icon: <WhatsAppIcon />, text: t("Undangan digital lewat WhatsApp dengan 5 tema, termasuk tema Bali beraksara Bali") },
    { icon: <BellRing />, text: t("Pengingat DP dan pelunasan masuk ke email dan Google Calendar, jadi tidak ada yang terlewat") },
    { icon: <Users />, text: t("Ajak hingga {n} pasangan atau keluarga ikut mengerjakan, tanpa bayar tambahan", { n: p.max_collaborators }) },
    { icon: <CircleCheck />, text: t("Notifikasi langsung saat tamu mengonfirmasi hadir") },
    { icon: <Printer />, text: t("Rundown hari H siap dicetak dalam PDF") },
    ...(p.max_projects > 1 ? [{ icon: <Briefcase />, text: t("{n} proyek pernikahan", { n: p.max_projects }) }] : []),
  ];
  const features = (p: PricedPlan) => points(p).map((x) => x.text);

  const tickets = (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      <Ticket n={t("Bonus 1")} name={BONUSES[0].name} value={formatIDR(BONUSES[0].value)} icon={<Palette className="size-[18px]" />} label={t("Nilai")}
        text={t("Kumpulkan ide dekorasi, busana, dan bunga. Palet warnamu terbentuk sendiri.")}>
        <div aria-hidden="true" className="mt-2 flex -space-x-1.5">{COLORS.map((c) => <span key={c} className="size-5 rounded-full border-2 border-surface" style={{ backgroundColor: c }} />)}</div>
      </Ticket>
      <Ticket n={t("Bonus 2")} name={BONUSES[1].name} value={formatIDR(BONUSES[1].value)} icon={<Plane className="size-[18px]" />} label={t("Nilai")}
        text={t("Susun tujuan, anggaran, dan rencana per hari untuk perjalanan setelah hari H.")}>
        <ul aria-hidden="true" className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          {[[t("Hari 1"), t("Check-in hotel")], [t("Hari 2"), t("Snorkeling pagi")]].map(([d, x]) => (
            <li key={d} className="flex items-center gap-1.5 rounded-full bg-plum-50 py-1 pr-2.5 pl-1">
              <span className="rounded-full bg-plum-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{d}</span><span className="text-neutral-800">{x}</span>
            </li>
          ))}
        </ul>
      </Ticket>
    </div>
  );

  if (!single) {
    return (
      <div>
        <div className={plans.length > 2 ? "mx-auto grid max-w-5xl gap-5 md:grid-cols-3" : "mx-auto grid max-w-3xl gap-5 md:grid-cols-2"}>
          {plans.map((p) => (
            <article key={p.id} className="hover-lift reveal flex flex-col rounded-2xl border-2 border-plum-600 bg-surface p-6 shadow-card sm:p-7">
              <h3 className="text-[17px] font-semibold text-neutral-900">{p.name}</h3>
              {p.promo && (
                <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-caution-bg px-2.5 py-1 text-xs font-medium text-caution">
                  <Tag className="size-3" aria-hidden="true" />{p.promo.name}{p.promo.ends_at && ` · ${t("sampai {date}", { date: formatDateCompact(p.promo.ends_at, undefined, lang) })}`}
                </p>
              )}
              <p className="tabular mt-3 flex flex-wrap items-baseline gap-x-2.5 text-[38px] leading-[44px] font-bold text-neutral-900">
                {formatIDR(p.final)}
                {p.final < p.original && <s className="text-base font-medium text-neutral-500">{formatIDR(p.original)}</s>}
              </p>
              <p className="text-[13px] text-neutral-600">{t("Sekali bayar, akses selamanya")}</p>
              <ul className="mt-5 mb-6 flex-1 space-y-2.5 text-sm text-neutral-700">
                {features(p).map((x) => <li key={x} className="flex items-start gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-plum-600" aria-hidden="true" />{x}</li>)}
                <li className="flex items-start gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-plum-600" aria-hidden="true" />{t("Bonus: Rona Impian dan Honeymoon Planner")}</li>
              </ul>
              <ButtonLink href={buyHref} size="lg" className="btn-glow w-full">{loggedIn ? t("Aktifkan paket ini") : t("Pilih paket ini")}<ArrowRight className="ml-0.5" /></ButtonLink>
              {trialDays && !loggedIn && <ButtonLink href="/login?mode=daftar" variant="ghost" className="mt-2 w-full">{t("Coba dulu {trialDays} hari gratis", { trialDays })}</ButtonLink>}
            </article>
          ))}
        </div>
        <p className="mt-10 mb-4 text-center text-[11px] font-semibold tracking-[0.18em] text-plum-600 uppercase">{t("Bonus untuk semua paket")}</p>
        <div className="mx-auto max-w-4xl">{tickets}</div>
      </div>
    );
  }

  const p = plans[0]!;
  const total = p.original + BONUS_TOTAL;
  const saved = total - p.final;
  const pct = saved > 0 ? Math.round((saved / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <article className="brand-canvas reveal relative flex min-w-0 flex-col overflow-hidden rounded-3xl p-6 text-white shadow-modal sm:p-8">
          <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full border border-white/10" />
          <span aria-hidden="true" className="pointer-events-none absolute -top-8 -right-4 size-36 rounded-full border border-white/10" />
          <p className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase">{t("Akses selamanya")}</p>
          <h3 className="mt-3 font-display text-[40px] leading-[44px] font-medium">{p.name}</h3>
          <p className="mt-1 text-[14px] text-white/75">{t("Semua yang kamu butuhkan untuk menyiapkan pernikahan, dalam satu paket.")}</p>
          <ul className="relative my-auto grid gap-x-8 gap-y-6 py-6 sm:grid-cols-2">
            {points(p).map((x) => (
              <li key={x.text} className="flex items-start gap-3 text-[14.5px] leading-6 text-white/95">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#EDD1DF] [&_svg]:size-4" aria-hidden="true">{x.icon}</span>
                <span>{x.text}</span>
              </li>
            ))}
          </ul>
        </article>

    {/* Nota nilai: sekaligus kartu pembayaran */}
          <aside aria-label={t("Rincian nilai")} className="reveal relative flex min-w-0 flex-col">
          <div className="receipt flex flex-1 flex-col bg-surface px-6 pt-6 pb-10 shadow-modal">
            <p className="text-center text-[11px] font-semibold tracking-[0.2em] text-neutral-500 uppercase">{t("Rincian nilai")}</p>
            <p className="mt-1 text-center font-display text-[26px] leading-7 font-medium text-neutral-900">{t("Yang kamu dapatkan")}</p>
            <ul className="mt-5 space-y-2.5 text-[14px]">
              <Line label={p.name} value={formatIDR(p.original)} />
              <Line label={BONUSES[0].name} value={formatIDR(BONUSES[0].value)} bonus={t("Bonus")} />
              <Line label={BONUSES[1].name} value={formatIDR(BONUSES[1].value)} bonus={t("Bonus")} />
            </ul>
            <div className="mt-4 flex items-baseline justify-between gap-3 border-t-2 border-neutral-900/80 pt-3 text-[14px]">
              <span className="font-semibold text-neutral-900">{t("Total nilai")}</span>
              <span className="tabular text-[17px] font-semibold text-neutral-900">{formatIDR(total)}</span>
            </div>
  
            <div className="relative mt-5 rounded-2xl bg-plum-50 p-4 text-center">
              {p.promo && (
                <p className="mb-1.5 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-plum-100 px-2.5 py-1 text-[11.5px] font-medium text-plum-800">
                  <Tag className="size-3" aria-hidden="true" />{p.promo.name}{p.promo.ends_at && ` · ${t("sampai {date}", { date: formatDateCompact(p.promo.ends_at, undefined, lang) })}`}
                </p>
              )}
              <p className="text-[12px] text-neutral-600">{t("Hari ini cukup bayar")}</p>
              <p className="tabular text-[40px] leading-[46px] font-bold text-plum-800"><CountUp value={p.final} kind="idr" duration={900} /></p>
              {saved > 0 && <p className="text-[12.5px] font-medium text-plum-700">{t("Hemat {v1} dari total nilai", { v1: formatIDR(saved) })}</p>}
              {pct > 0 && (
                <span aria-hidden="true" className="absolute -top-5 -right-3 inline-flex size-[72px] -rotate-12 flex-col items-center justify-center rounded-full border-2 border-dashed border-plum-600 bg-surface text-plum-700 shadow-sm">
                  <span className="tabular text-[20px] leading-5 font-bold">{pct}%</span>
                  <span className="text-[9px] font-semibold tracking-wider uppercase">{t("hemat")}</span>
                </span>
              )}
            </div>
  
            <ButtonLink href={buyHref} size="lg" className="btn-glow mt-5 w-full">{t("Dapatkan Sekarang")}<ArrowRight className="ml-0.5" /></ButtonLink>
            {trialDays && !loggedIn && <ButtonLink href="/login?mode=daftar" variant="ghost" className="mt-2 w-full">{t("Coba dulu {trialDays} hari gratis", { trialDays })}</ButtonLink>}
            <ul className="mt-4 space-y-1.5 text-[12.5px] text-neutral-600">
              {[t("Sekali bayar, akses selamanya, tanpa langganan"), t("Data tetap aman dan bisa dilihat bila akses berakhir")].map((x) => (
                <li key={x} className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-plum-600" aria-hidden="true" />{x}</li>
              ))}
            </ul>
            <p className="mt-3 text-center text-[12px] text-neutral-500">{t("Pembayaran lewat QRIS, Virtual Account, GoPay, ShopeePay, dan kartu kredit.")}</p>
          </div>
        </aside>
        </div>

      <div>
        <p className="mb-3 flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-plum-600 uppercase after:h-px after:flex-1 after:bg-plum-200">{t("Bonus untukmu")}</p>
        {tickets}
      </div>
    </div>
  );
}

// Tiket bonus kecil: tepi bertakik dan "stub" nilai di ujung kanan
function Ticket({ n, name, value, icon, label, text, children }: { n: string; name: string; value: string; icon: React.ReactNode; label: string; text: string; children: React.ReactNode }) {
  return (
    <article className="ticket ticket-sm hover-lift reveal flex min-w-0 border border-neutral-200/80 bg-surface">
      <div className="min-w-0 flex-1 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-plum-600 text-white" aria-hidden="true">{icon}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-plum-600 uppercase">{n}</p>
            <h4 className="truncate text-[15px] leading-5 font-semibold text-neutral-900">{name}</h4>
          </div>
        </div>
        <p className="mt-1.5 text-[12.5px] leading-5 text-neutral-600">{text}</p>
        {children}
      </div>
      <div className="flex w-[96px] shrink-0 flex-col items-center justify-center gap-0.5 border-l border-dashed border-neutral-300 px-2 text-center">
        <span className="text-[9.5px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">{label}</span>
        <span className="tabular text-[15px] leading-5 font-bold text-plum-700">{value}</span>
      </div>
    </article>
  );
}

function Line({ label, value, bonus }: { label: string; value: string; bonus?: string }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="text-neutral-800">{label}</span>
      {bonus && <span className="self-center rounded-full bg-plum-100 px-1.5 py-px text-[9.5px] font-semibold tracking-wide text-plum-700 uppercase">{bonus}</span>}
      <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-neutral-400" />
      <span className="tabular font-medium text-neutral-900">{value}</span>
    </li>
  );
}
