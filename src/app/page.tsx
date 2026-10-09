import Link from "next/link";
import {
  BookOpen, CalendarDays, Check, Clock, FileText, Gift, LayoutGrid, ListChecks, Mail, SlidersHorizontal, Sparkles, Store, Tag, Wallet,
} from "lucide-react";
import { Logo } from "@/components/app/logo";
import { ButtonLink } from "@/components/ui/button";
import { getSession } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { formatDateCompact, formatIDR } from "@/lib/format";
import { priceFor } from "@/lib/pricing";
import { getPricingContext, getSettings } from "@/lib/settings";
import { jsonLd, pageMetadata, SITE } from "@/lib/seo";
import { getT } from "@/i18n/server";
import { ThemeToggle } from "@/components/app/theme";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { getI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return pageMetadata({ path: "/", tr: await getT() });
}

const FEATURES = [
  { icon: <LayoutGrid />, title: "Dashboard", text: "Hitung mundur, budget terpakai, tamu hadir, dan agenda 14 hari ke depan." },
  { icon: <SlidersHorizontal />, title: "Pengaturan Pernikahan", text: "Data pasangan, acara, budget, target tamu, dan kolaborator." },
  { icon: <BookOpen />, title: "Panduan Penggunaan", text: "Delapan langkah yang tercentang otomatis saat kamu mengisinya." },
  { icon: <ListChecks />, title: "To Do Checklist", text: "Checklist per fase, due date dihitung mundur dari hari H." },
  { icon: <Wallet />, title: "Budgeting", text: "Alokasi per kategori, realisasi, jadwal DP dan pelunasan, dan peringatan bila melebihi budget." },
  { icon: <Store />, title: "Kelola Vendor", text: "Dari prospek sampai deal, bandingkan paket, dan chat WhatsApp langsung." },
  { icon: <Mail />, title: "Tamu & RSVP", text: "Link RSVP pribadi per tamu, kirim lewat WhatsApp, rekap kehadiran otomatis." },
  { icon: <Clock />, title: "Rundown Hari H", text: "Susunan acara dengan PIC dan lokasi, plus PDF formal untuk dicetak." },
  { icon: <Gift />, title: "Mahar & Seserahan", text: "Daftar item, harga, link toko, dan status pembelian." },
  { icon: <FileText />, title: "Dokumen Penting", text: "Checklist dokumen KUA atau catatan sipil dan arsip berkas yang privat." },
  { icon: <CalendarDays />, title: "Reminder & Calendar", text: "Tugas, pembayaran vendor, acara, dan agenda. Bisa disinkronkan ke Google Calendar." },
];

const STEPS = [
  { title: "Daftar dan mulai", text: "Masuk dengan email atau Google, lalu coba atau aktifkan dengan paket atau kode akses." },
  { title: "Isi data pernikahan", text: "Nama pasangan, tanggal, kota, dan budget. Checklist rekomendasi langsung dibuat." },
  { title: "Rencanakan bersama", text: "Undang pasangan atau keluarga, catat vendor, dan kirim RSVP lewat WhatsApp." },
];

const FAQ = [
  { q: "Apa itu Monaplan?", a: "Aplikasi wedding planner untuk calon pengantin di Indonesia: checklist, budget, vendor, tamu dan RSVP, rundown, mahar, dokumen, dan pengingat." },
  { q: "Apakah bisa dipakai bersama pasangan atau keluarga?", a: "Bisa. Pemilik mengundang kolaborator sebagai Editor atau Viewer, sebanyak yang diizinkan paketnya. Mereka tidak perlu membayar." },
  { q: "Bagaimana tamu mengonfirmasi kehadiran?", a: "Tiap tamu menerima link RSVP pribadi lewat WhatsApp. Tamu memilih hadir, tidak hadir, atau ragu tanpa membuat akun." },
  { q: "Berapa lama akses setelah membayar?", a: "Selamanya. Sekali bayar, tanpa langganan." },
  { q: "Apakah ada masa coba gratis?", a: "Ada, selama fitur trial aktif. Akun baru bisa langsung mencoba semua modul tanpa memilih paket dan tanpa kartu kredit. Setelah trial berakhir, data tetap aman dan bisa dilihat; aktifkan akses selamanya untuk kembali mengedit." },
  { q: "Bisakah jadwal dari Monaplan muncul di Google Calendar?", a: "Bisa. Hubungkan akun Google dari halaman Reminder & Calendar. Jadwalmu muncul di kalender khusus Monaplan." },
  { q: "Apakah data pernikahan kami aman?", a: "Data tiap ruang kerja dipisahkan di database, berkas disimpan privat, dan pengolahan data mengikuti UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi." },
  { q: "Apa yang terjadi bila masa trial habis?", a: "Data tetap aman dan bisa dilihat serta diekspor. Aktifkan akses selamanya untuk mengedit lagi. Halaman RSVP tamu tetap berjalan 30 hari." },
];

export default async function LandingPage() {
  const { t, lang } = await getI18n();
  let plans: any[] = [];
  let loggedIn = false;
  let trialDays: number | null = null;
  let priced: Record<string, ReturnType<typeof priceFor>> = {};
  try {
    const supabase = await createClient();
    const [{ data }, settings, ctx] = await Promise.all([
      supabase.from("plans").select("*").eq("type", "lifetime").order("tier").order("sort_order"),
      getSettings(),
      getPricingContext(),
    ]);
    plans = data ?? [];
    trialDays = settings.trial.enabled ? settings.trial.days : null;
    priced = Object.fromEntries(plans.map((p) => [p.id, priceFor(p, ctx.promos, ctx.promoEnabled)]));
    loggedIn = !!(await getSession());
  } catch {
    // env belum diisi: landing tetap tampil
  }
  const sortedPlans = plans;
  const trialLabel = trialDays ? t("Coba Gratis {days} Hari", { days: trialDays }) : null;

  // Data terstruktur schema.org untuk rich result
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${SITE.url}/#organization`, name: SITE.name, url: SITE.url, logo: `${SITE.url}/apple-icon` },
      { "@type": "WebSite", "@id": `${SITE.url}/#website`, url: SITE.url, name: SITE.name, inLanguage: "id-ID", publisher: { "@id": `${SITE.url}/#organization` } },
      {
        "@type": "SoftwareApplication",
        name: SITE.name,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        inLanguage: "id-ID",
        description: SITE.description,
        url: SITE.url,
        featureList: FEATURES.map((f) => t(f.title)),
        ...(plans.length && {
          offers: plans.map((p) => ({ "@type": "Offer", name: p.name, price: priced[p.id]?.final ?? p.price_idr, priceCurrency: "IDR", availability: "https://schema.org/InStock", url: `${SITE.url}/login?mode=daftar` })),
        }),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({ "@type": "Question", name: t(f.q), acceptedAnswer: { "@type": "Answer", text: t(f.a) } })),
      },
    ],
  };

  return (
    <div className="min-h-dvh bg-plum-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav aria-label={t("Navigasi utama")} className="flex items-center gap-1 sm:gap-2">
          <a href="#fitur" className="hidden rounded-full px-3 py-2 text-sm text-neutral-700 hover:text-plum-700 sm:block">{t("Fitur")}</a>
          {plans.length > 0 && <a href="#harga" className="hidden rounded-full px-3 py-2 text-sm text-neutral-700 hover:text-plum-700 sm:block">{t("Harga")}</a>}
          <a href="#faq" className="hidden rounded-full px-3 py-2 text-sm text-neutral-700 hover:text-plum-700 sm:block">{t("FAQ")}</a>
          <ThemeToggle />
          <LanguageSwitcher compact className="mr-1 hidden sm:inline-flex" />
          {loggedIn ? (
            <ButtonLink href="/mulai" variant="dark">{t("Buka Dashboard")}</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost">{t("Masuk")}</ButtonLink>
              <ButtonLink href="/login?mode=daftar" variant="dark">{trialLabel ?? t("Daftar")}</ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main>
        <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pt-10 pb-16 text-center sm:px-6 md:pt-16">
          {trialDays && !loggedIn ? (
            <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-plum-700 shadow-card ring-1 ring-plum-100">
              <Sparkles className="size-4" aria-hidden="true" />{t("Coba gratis")}{" "}{trialDays}{" "}{t("hari, tanpa kartu kredit")}</p>
          ) : (
            <p className="text-[11px] font-semibold tracking-[0.12em] text-plum-600 uppercase">{t("Aplikasi Wedding Planner Digital")}</p>
          )}
          <h1 id="hero-title" className="mx-auto mt-3 max-w-3xl font-display text-[40px] leading-[48px] font-medium text-neutral-900 md:text-[56px] md:leading-[64px]">{t("Atur pernikahanmu di satu aplikasi.")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-6 text-neutral-600">{t("Checklist, budget, vendor, tamu dan RSVP, rundown, serta dokumen nikah. Bisa dikerjakan bersama pasangan dan keluarga.")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={loggedIn ? "/mulai" : "/login?mode=daftar"} size="lg">{loggedIn ? t("Mulai Merencanakan") : (trialLabel ?? t("Mulai Merencanakan"))}</ButtonLink>
            <ButtonLink href="#fitur" size="lg" variant="outline">{t("Lihat Fitur")}</ButtonLink>
          </div>
        </section>

        <section id="fitur" aria-labelledby="fitur-title" className="mx-auto max-w-6xl scroll-mt-6 px-4 pb-16 sm:px-6">
          <h2 id="fitur-title" className="mb-2 text-center font-display text-[32px] leading-10 font-medium text-neutral-900">{t("11 modul untuk persiapan nikah")}</h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-neutral-600">{t("Vendor yang deal masuk ke budget, jadwal pembayaran masuk ke kalender, dan RSVP tamu terekap otomatis.")}</p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="hover-lift reveal rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-card">
                <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-plum-100 text-plum-700 [&_svg]:size-5" aria-hidden="true">{f.icon}</span>
                <h3 className="text-base font-semibold text-neutral-900">{t(f.title)}</h3>
                <p className="mt-1 text-[13px] leading-5 text-neutral-600">{t(f.text)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="cara-title" className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <h2 id="cara-title" className="mb-8 text-center font-display text-[32px] leading-10 font-medium text-neutral-900">{t("Cara memulai")}</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="hover-lift reveal rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-card">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-plum-600 text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-3 text-base font-semibold text-neutral-900">{t(s.title)}</h3>
                <p className="mt-1 text-[13px] leading-5 text-neutral-600">{t(s.text)}</p>
              </li>
            ))}
          </ol>
        </section>

        {sortedPlans.length > 0 && (
          <section id="harga" aria-labelledby="harga-title" className="mx-auto max-w-4xl scroll-mt-6 px-4 pb-16 sm:px-6">
            <h2 id="harga-title" className="mb-8 text-center font-display text-[32px] leading-10 font-medium text-neutral-900">{t("Harga paket")}</h2>
            <div className={sortedPlans.length > 2 ? "grid gap-4 md:grid-cols-3" : sortedPlans.length > 1 ? "grid gap-4 md:grid-cols-2" : "mx-auto grid max-w-md gap-4"}>
              {sortedPlans.map((p) => {
                const price = priced[p.id] ?? priceFor(p, [], false);
                const promo = price.promo;
                return (
                <article key={p.id} className="hover-lift reveal rounded-2xl border-2 border-plum-600 bg-surface p-6 shadow-card">
                  <h3 className="text-base font-semibold text-neutral-900">{p.name}</h3>
                  {promo && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-caution-bg px-2.5 py-1 text-xs font-medium text-caution">
                      <Tag className="size-3" aria-hidden="true" />{promo.name}{promo.ends_at && ` · ${t("sampai {date}", { date: formatDateCompact(promo.ends_at, undefined, lang) })}`}
                    </p>
                  )}
                  <p className="tabular mt-2 text-[32px] leading-10 font-bold text-neutral-900">
                    {formatIDR(price.final)}
                    {promo && <s className="ml-2 text-base font-medium text-neutral-500">{formatIDR(price.original)}</s>}
                  </p>
                  <p className="text-[13px] text-neutral-600">{t("Sekali bayar, akses selamanya")}</p>
                  <ul className="mt-4 space-y-2 text-sm text-neutral-700">
                    {[t("Semua 11 modul"), t("Hingga {n} kolaborator", { n: p.max_collaborators }), t("Penyimpanan {mb} MB", { mb: p.storage_quota_mb }), ...(p.max_projects > 1 ? [t("{n} proyek pernikahan", { n: p.max_projects })] : []), t("Halaman RSVP untuk tamu"), t("Sinkron ke Google Calendar")].map((x) => (
                      <li key={x} className="flex items-center gap-2"><Check className="size-4 text-plum-600" aria-hidden="true" />{x}</li>
                    ))}
                  </ul>
                  {trialDays && !loggedIn && (
                    <ButtonLink href="/login?mode=daftar" variant="outline" className="mt-5 w-full">{t("Coba dulu {trialDays} hari gratis", { trialDays })}</ButtonLink>
                  )}
                </article>
                );
              })}
            </div>
          </section>
        )}

        <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl scroll-mt-6 px-4 pb-20 sm:px-6">
          <h2 id="faq-title" className="mb-8 text-center font-display text-[32px] leading-10 font-medium text-neutral-900">{t("Pertanyaan yang sering diajukan")}</h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-neutral-200/80 bg-surface px-5 py-4 shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-neutral-900">
                  <h3>{t(f.q)}</h3>
                  <span className="text-plum-600 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{t(f.a)}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 py-6 text-center text-[13px] text-neutral-500">
        © {new Date().getFullYear()} {SITE.name} · <Link href="/privasi" className="hover:text-plum-600">{t("Kebijakan privasi")}</Link>
      </footer>
    </div>
  );
}
