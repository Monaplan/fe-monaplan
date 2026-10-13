import { Suspense, type ReactNode } from "react";
import { AnimationGate } from "@/components/landing/animation-gate";
import { BackToTop } from "@/components/landing/back-to-top";
import { PromoPopupLoader } from "@/components/app/promo-popup-loader";
import Link from "next/link";
import {
  ArrowRight, BellRing, BookOpen, CalendarDays, Check, CircleCheck, Clock, FileText, Gift, HandCoins, LayoutGrid, ListChecks, Mail, Palette, PartyPopper, Plane, ScanLine, ShieldCheck, SlidersHorizontal, Store, Users, Wallet
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { Logo } from "@/components/app/logo";
import { ButtonLink } from "@/components/ui/button";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { ChaosOrder } from "@/components/landing/chaos-order";
import { Roadmap, type RoadmapPhase } from "@/components/landing/roadmap";
import { RolesTabs } from "@/components/landing/roles-tabs";
import { PricingBonus, type PricedPlan } from "@/components/landing/pricing-bonus";
import { InstallGuide } from "@/components/app/install-guide";
import { BONUS_TOTAL } from "@/content/bonus";
import { getSession } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatIDR } from "@/lib/format";
import { priceFor } from "@/lib/pricing";
import { getPricingContext, getSettings } from "@/lib/settings";
import { ttl } from "@/lib/ttl-cache";
import { jsonLd, pageMetadata, SITE } from "@/lib/seo";
import { supportWhatsappUrl } from "@/lib/support";
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
  { icon: <BookOpen />, title: "Panduan Penggunaan", text: "Sembilan langkah yang tercentang otomatis saat kamu mengisinya, termasuk cara memasang Monaplan di HP." },
  { icon: <ListChecks />, title: "To Do Checklist", text: "Checklist per fase, due date dihitung mundur dari hari H, dan progres tiap orang saat tugas dibagi berdua." },
  { icon: <Wallet />, title: "Budgeting", text: "Alokasi per kategori, jadwal DP dan pelunasan, pembagian biaya pihak pria dan wanita, serta target tabungan per bulan." },
  { icon: <Store />, title: "Kelola Vendor", text: "Dari prospek sampai deal, bandingkan paket, dan chat WhatsApp langsung." },
  { icon: <Mail />, title: "Tamu & RSVP", text: "Link RSVP pribadi per tamu lewat WhatsApp, rekap kehadiran otomatis, dan QR masuk untuk tamu yang hadir." },
  { icon: <Clock />, title: "Rundown Hari H", text: "Susunan acara dengan PIC dan lokasi, plus PDF formal untuk dicetak." },
  { icon: <Gift />, title: "Mahar & Seserahan", text: "Daftar item, harga, link toko, dan status pembelian." },
  { icon: <FileText />, title: "Dokumen Penting", text: "Checklist dokumen KUA atau catatan sipil dan arsip berkas yang privat." },
  { icon: <CalendarDays />, title: "Reminder & Calendar", text: "Tugas, pembayaran vendor, acara, dan agenda. Masuk ke Google Calendar dan notifikasi HP." },
  { icon: <PartyPopper />, title: "Mode Hari H", text: "Rundown yang berjalan sesuai jam, kontak vendor sekali ketuk, dan check-in tamu dengan QR, juga lewat tautan panitia." },
  { icon: <HandCoins />, title: "Amplop & Kado", text: "Catat amplop, transfer, dan kado dari tamu, lalu kirim ucapan terima kasih lewat WhatsApp." },
];

const FAQ = [
  { q: "Apa itu Monaplan?", a: "Aplikasi wedding planner untuk calon pengantin di Indonesia: checklist, budget, vendor, tamu dan RSVP, rundown, mahar, dokumen, pengingat, sampai check-in tamu dan catatan amplop di hari H." },
  { q: "Takut ribet dipakai?", a: "Mulai dari satu tugas. Checklist rekomendasi sudah terisi begitu data pernikahan dimasukkan, jadi tidak perlu menyusun dari nol." },
  { q: "Apakah bisa dipakai bersama pasangan atau keluarga?", a: "Bisa. Pemilik mengundang kolaborator sebagai Editor atau Viewer, sebanyak yang diizinkan paketnya. Mereka tidak perlu membayar." },
  { q: "Kami sama-sama sibuk kerja, apakah tetap terkejar?", a: "Justru karena itu. Progres kecil yang konsisten terasa lebih ringan daripada menumpuk di akhir, dan pasangan bisa ikut mengerjakan." },
  { q: "Bagaimana tamu mengonfirmasi kehadiran?", a: "Tiap tamu menerima link RSVP pribadi lewat WhatsApp. Tamu memilih hadir, tidak hadir, atau ragu tanpa membuat akun." },
  { q: "Berapa lama akses setelah membayar?", a: "Selamanya. Sekali bayar, tanpa langganan." },
  { q: "Apakah ada masa coba gratis?", a: "Ada, selama fitur trial aktif. Akun baru bisa langsung mencoba semua modul tanpa memilih paket dan tanpa kartu kredit. Setelah trial berakhir, data tetap aman dan bisa dilihat; aktifkan akses selamanya untuk kembali mengedit." },
  { q: "Bisakah jadwal dari Monaplan muncul di Google Calendar?", a: "Bisa. Hubungkan akun Google dari halaman Reminder & Calendar. Jadwalmu muncul di kalender khusus Monaplan." },
  { q: "Bagaimana check-in tamu di hari H?", a: "Tamu yang menjawab hadir mendapat QR masuk di undangannya. Penerima tamu memindainya dari HP lewat Mode Hari H atau tautan panitia tanpa perlu akun, dan jumlah yang hadir langsung terekap." },
  { q: "Bisakah mencatat amplop dan kado dari tamu?", a: "Bisa. Catat amplop, transfer, dan kado di Amplop & Kado, lalu kirim ucapan terima kasih lewat WhatsApp dengan satu ketukan." },
  { q: "Biaya ditanggung dua keluarga, bisa dipisah?", a: "Bisa. Tandai setiap item budget ditanggung pihak pria, pihak wanita, atau bersama, lalu lihat rekap per pihak. Target tabungan per bulan juga dihitung otomatis." },
  { q: "Apakah Monaplan bisa dipasang di HP?", a: "Bisa, tanpa unduh dari Play Store atau App Store. Buka Monaplan di browser HP lalu pilih Pasang atau Tambahkan ke Layar Utama, kemudian nyalakan notifikasi di halaman Akun." },
  { q: "Pernikahanku masih lama, apakah terlalu cepat memulai?", a: "Tidak. Kamu punya waktu untuk mencicil persiapan tanpa dikejar tenggat." },
  { q: "Apakah data pernikahan kami aman?", a: "Data tiap ruang kerja dipisahkan di database, berkas disimpan privat, dan pengolahan data mengikuti UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi." },
  { q: "Apa yang terjadi bila masa trial habis?", a: "Data tetap aman dan bisa dilihat serta diekspor. Aktifkan akses selamanya untuk mengedit lagi. Halaman RSVP tamu tetap berjalan 30 hari." },
];

const eyebrow = "mx-auto flex w-fit items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-plum-600 uppercase before:h-px before:w-6 before:bg-plum-300 after:h-px after:w-6 after:bg-plum-300";
const h2 = "[font-variant-numeric:lining-nums] mx-auto mt-3 max-w-3xl text-center font-display text-[34px] leading-[1.1] font-medium text-neutral-900 md:text-[46px]";
const em = "italic text-plum-600";

// Fitur yang berjalan di bawah hero (ikon dan kunci teks; teks diterjemahkan saat dirender)
const MARQUEE: [React.ReactNode, string][] = [
  [<ListChecks key="1" />, "Checklist per fase"],
  [<Wallet key="2" />, "Budget dan jadwal pelunasan"],
  [<Store key="3" />, "Kelola vendor"],
  [<Mail key="4" />, "Tamu dan RSVP"],
  [<WhatsAppIcon key="5" />, "Undangan lewat WhatsApp"],
  [<Clock key="6" />, "Rundown hari H"],
  [<Gift key="7" />, "Mahar dan seserahan"],
  [<FileText key="8" />, "Dokumen KUA dan catatan sipil"],
  [<CalendarDays key="9" />, "Reminder dan Google Calendar"],
  [<PartyPopper key="14" />, "Mode Hari H"],
  [<ScanLine key="15" />, "Check-in tamu dengan QR"],
  [<HandCoins key="16" />, "Catatan amplop dan kado"],
  [<BellRing key="17" />, "Notifikasi langsung di HP"],
  [<Palette key="10" />, "Rona Impian"],
  [<Plane key="11" />, "Honeymoon Planner"],
  [<Users key="12" />, "Dikerjakan berdua"],
  [<ShieldCheck key="13" />, "Data privat per pernikahan"],
];

function SectionHead({ id, label, children, sub }: { id: string; label: string; children: ReactNode; sub?: string }) {
  return (
    <div className="reveal mb-10 md:mb-12">
      <p className={eyebrow}>{label}</p>
      <h2 id={id} className={h2}>{children}</h2>
      {sub && <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-7 text-neutral-600">{sub}</p>}
    </div>
  );
}

// Jumlah tugas rekomendasi per fase untuk peta jalan. Diambil dari template checklist yang nyata dan disimpan 10 menit di memori.
const PHASE_GROUPS: Record<string, string[]> = { dasar: ["m12_plus", "m12_6"], vendor: ["m6_3"], undangan: ["m3_1"], harih: ["m1", "w1", "hari_h"] };
let phaseCache: { at: number; value: RoadmapPhase[] } | null = null;
async function phaseCounts(): Promise<RoadmapPhase[]> {
  if (phaseCache && Date.now() - phaseCache.at < 600_000) return phaseCache.value;
  try {
    const { data } = await createAdminClient().from("checklist_templates").select("phase_key").eq("is_active", true).limit(1000);
    const by = (data ?? []).reduce<Record<string, number>>((m, r) => ({ ...m, [r.phase_key as string]: (m[r.phase_key as string] ?? 0) + 1 }), {});
    const value = Object.entries(PHASE_GROUPS).map(([key, keys]) => ({ key, count: keys.reduce((s, k) => s + (by[k] ?? 0), 0) }));
    phaseCache = { at: Date.now(), value };
    return value;
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const { t, lang } = await getI18n();
  let plans: any[] = [];
  let loggedIn = false;
  let trialDays: number | null = null;
  let priced: Record<string, ReturnType<typeof priceFor>> = {};
  let counts: RoadmapPhase[] = [];
  try {
    const [data, settings, ctx, c, session] = await Promise.all([
      ttl("plans:lifetime", 30_000, async () => (await createAdminClient().from("plans").select("*").eq("type", "lifetime").eq("is_active", true).eq("is_public", true).order("tier").order("sort_order")).data),
      getSettings(),
      getPricingContext(),
      phaseCounts(),
      getSession(),
    ]);
    plans = data ?? [];
    counts = c;
    trialDays = settings.trial.enabled ? settings.trial.days : null;
    priced = Object.fromEntries(plans.map((p) => [p.id, priceFor(p, ctx.promos, ctx.promoEnabled)]));
    loggedIn = !!session;
  } catch {
    // env belum diisi: landing tetap tampil
  }

  const trialLabel = trialDays ? t("Coba Gratis {days} Hari", { days: trialDays }) : null;
  const startHref = loggedIn ? "/mulai" : "/login?mode=daftar";
  const buyHref = loggedIn ? "/aktivasi" : `/login?mode=daftar&next=${encodeURIComponent("/aktivasi")}`;
  const wa = supportWhatsappUrl("Halo, saya mau tanya soal Monaplan.");

  const pricedPlans: PricedPlan[] = plans.map((p) => {
    const r = priced[p.id] ?? priceFor(p, [], false);
    return {
      id: p.id, name: p.name, max_collaborators: p.max_collaborators, storage_quota_mb: p.storage_quota_mb, max_projects: p.max_projects ?? 1,
      original: r.original, final: r.final, promo: r.promo ? { name: r.promo.name, ends_at: r.promo.ends_at } : null,
    };
  });
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
    <div className="min-h-dvh overflow-x-clip bg-plum-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />

      <a href="#konten" className="sr-only z-[120] rounded-full bg-plum-700 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">{t("Lewati ke konten")}</a>
      <header className="sticky top-0 z-30 border-b border-plum-100/70 bg-plum-50/95 md:bg-plum-50/85 md:backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <nav aria-label={t("Navigasi utama")} className="hidden items-center gap-1 md:flex">
            {[["#fitur", t("Fitur")], ["#pasang", t("Pasang di HP")], ...(plans.length ? [["#harga", t("Harga")]] : []), ["#faq", t("FAQ")]].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-surface hover:text-plum-700">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <LanguageSwitcher compact className="hidden sm:inline-flex" />
            {loggedIn ? (
              <ButtonLink href="/mulai" variant="dark">{t("Buka Dashboard")}</ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" className="hidden sm:inline-flex">{t("Masuk")}</ButtonLink>
                <ButtonLink href="/login?mode=daftar" variant="dark">{trialLabel ?? t("Daftar")}</ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="konten">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="relative">
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-14 sm:px-6 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-8 lg:pb-24">
            <div className="animate-sheet-in text-center lg:text-left">
              <h1 id="hero-title">
                <span className="block font-display text-[22px] leading-7 font-medium text-neutral-600 md:text-[26px]">{t("Tenang menuju pelaminan,")}</span>
                <span className={`mx-auto mt-3 block font-display text-[clamp(28px,calc((100vw_-_2rem)/8.6),46px)] leading-[1.1] font-medium tracking-[-0.015em] text-neutral-900 [font-variant-numeric:lining-nums] md:text-[56px] lg:mx-0 lg:max-w-[16ch] lg:text-[62px] lg:leading-[1.05] lg:text-balance ${lang === "id" ? "max-lg:whitespace-nowrap" : "text-balance"}`}>
                  {t("Persiapannya biar")}{" "}{lang === "id" && <br className="lg:hidden" />}<em className={em}>{t("Monaplan yang rapikan.")}</em>
                </span>
              </h1>
              <ul className="mx-auto mt-6 flex max-w-[21rem] flex-wrap justify-center gap-x-5 gap-y-2.5 text-[13.5px] text-neutral-600 lg:mx-0 lg:max-w-none lg:justify-start lg:text-[14px]">
                {([
                  [t("Sekali bayar"), t("Sekali bayar, tanpa langganan")],
                  [t("Bisa lewat ponsel"), t("Bisa dibuka dari ponsel")],
                  [t("Bareng pasangan"), t("Undang pasangan dan keluarga")],
                  [t("Bonus {v1}", { v1: formatIDR(BONUS_TOTAL) }), t("Bonus senilai {v1}", { v1: formatIDR(BONUS_TOTAL) })],
                ] as const).map(([short, long]) => (
                  <li key={long} className="flex items-center gap-1.5 whitespace-nowrap"><CircleCheck className="size-4 shrink-0 text-plum-600" aria-hidden="true" /><span className="lg:hidden">{short}</span><span className="hidden lg:inline">{long}</span></li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
                <ButtonLink href={startHref} size="lg">{loggedIn ? t("Mulai Merencanakan") : (trialLabel ?? t("Mulai Merencanakan"))}<ArrowRight className="ml-0.5" /></ButtonLink>
                <ButtonLink href="#fitur" size="lg" variant="ghost">{t("Lihat isi aplikasinya")}</ButtonLink>
              </div>
            </div>
            <HeroMockup />
          </div>
        </section>

        {/* Daftar fitur berjalan; berhenti saat disorot dan menjadi daftar biasa bila gerak dikurangi */}
        <section aria-label={t("Fitur Monaplan")} className="overflow-hidden border-y border-plum-100/80 bg-surface/60 py-4">
          <div className="marquee-mask">
            <ul className="marquee-track flex w-max items-center text-[13.5px] text-neutral-700">
              {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map(([icon, label], i) => (
                <li key={i} aria-hidden={i >= MARQUEE.length} className="flex shrink-0 items-center gap-2.5 pr-9"><span className="text-plum-600 [&_svg]:size-4" aria-hidden="true">{icon}</span>{t(label as string)}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Sebelum dan sesudah */}
        <section aria-labelledby="sebelum-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <SectionHead id="sebelum-title" label={t("Sebelum dan sesudah")} sub={t("Daftar tamu di spreadsheet, vendor di chat, budget di catatan ponsel. Semuanya bisa dikumpulkan di satu tempat.")}>
            {t("Hari ini lima tempat.")} <em className={em}>{t("Besok satu halaman.")}</em>
          </SectionHead>
          <ChaosOrder />
        </section>

        {/* Peta jalan */}
        <section aria-labelledby="peta-title" className="border-y border-plum-100/80 bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <SectionHead id="peta-title" label={t("Peta jalan")} sub={t("Masukkan tanggal nikahmu dan lihat kamu sedang di fase mana. Jumlah tugas diambil dari checklist rekomendasi Monaplan.")}>
              {t("Dari sekarang sampai hari H,")} <em className={em}>{t("ini yang menunggumu.")}</em>
            </SectionHead>
            <Roadmap counts={counts} />
          </div>
        </section>

        {/* Fitur */}
        <section id="fitur" aria-labelledby="fitur-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24">
          <SectionHead id="fitur-title" label={t("Isi aplikasinya")} sub={t("Vendor yang deal masuk ke budget, jadwal pembayaran masuk ke kalender, dan RSVP tamu terekap otomatis.")}>
            {t("Tiga belas modul yang")} <em className={em}>{t("saling terhubung.")}</em>
          </SectionHead>

          <div className="grid gap-4 md:grid-cols-6">
            <article className="hover-lift reveal rounded-2xl border border-neutral-200/80 bg-surface p-6 shadow-card md:col-span-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-plum-100 text-plum-700 [&_svg]:size-5" aria-hidden="true"><ListChecks /></span>
              <h3 className="mt-4 text-[17px] font-semibold text-neutral-900">{t("To Do Checklist")}</h3>
              <p className="mt-1 text-[14px] leading-6 text-neutral-600">{t("Checklist per fase, due date dihitung mundur dari hari H, dan progres tiap orang saat tugas dibagi berdua.")}</p>
              <ul aria-hidden="true" className="mt-5 space-y-3">
                {[[t("12 sampai 6 bulan"), 100], [t("6 sampai 3 bulan"), 62], [t("3 sampai 1 bulan"), 25], [t("Minggu terakhir"), 0]].map(([label, v]) => (
                  <li key={label as string}>
                    <div className="mb-1 flex justify-between text-[12px] text-neutral-600"><span>{label}</span><span className="tabular">{v}%</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-plum-100"><div className="h-full rounded-full bg-plum-600" style={{ width: `${v}%` }} /></div>
                  </li>
                ))}
              </ul>
            </article>

            <article className="hover-lift reveal rounded-2xl border border-neutral-200/80 bg-surface p-6 shadow-card md:col-span-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-plum-100 text-plum-700 [&_svg]:size-5" aria-hidden="true"><Wallet /></span>
              <h3 className="mt-4 text-[17px] font-semibold text-neutral-900">{t("Budgeting")}</h3>
              <p className="mt-1 text-[14px] leading-6 text-neutral-600">{t("Alokasi per kategori, jadwal DP dan pelunasan, pembagian biaya pihak pria dan wanita, serta target tabungan per bulan.")}</p>
              <div aria-hidden="true" className="mt-5 flex h-24 items-end gap-2">
                {[[t("Venue"), 80, 70], [t("Katering"), 90, 95], [t("Dekor"), 45, 30], [t("Foto"), 40, 40], [t("Busana"), 55, 20]].map(([label, est, act]) => (
                  <div key={label as string} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-20 w-full items-end gap-1">
                      <span className="w-full rounded-t bg-plum-200" style={{ height: `${est}%` }} />
                      <span className="w-full rounded-t bg-plum-600" style={{ height: `${act}%` }} />
                    </div>
                    <span className="text-[10px] text-neutral-500">{label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="hover-lift reveal rounded-2xl border border-neutral-200/80 bg-surface p-6 shadow-card md:col-span-2">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-plum-100 text-plum-700 [&_svg]:size-5" aria-hidden="true"><Mail /></span>
              <h3 className="mt-4 text-[17px] font-semibold text-neutral-900">{t("Tamu & RSVP")}</h3>
              <p className="mt-1 text-[14px] leading-6 text-neutral-600">{t("Link RSVP pribadi per tamu lewat WhatsApp, rekap kehadiran otomatis, dan QR masuk untuk tamu yang hadir.")}</p>
              <ul aria-hidden="true" className="mt-4 space-y-2">
                {[["Bapak Hendra", t("Hadir"), true], ["Ibu Sari", t("Hadir"), true], ["Mas Dimas", t("Ragu"), false]].map(([n, s, ok]) => (
                  <li key={n as string} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-[12px]">
                    <span className="text-neutral-800">{n}</span>
                    <span className={ok ? "rounded-full bg-plum-100 px-2 py-0.5 font-medium text-plum-700" : "rounded-full bg-caution-bg px-2 py-0.5 font-medium text-caution"}>{s}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="hover-lift reveal rounded-2xl border border-neutral-200/80 bg-surface p-6 shadow-card md:col-span-2">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-plum-100 text-plum-700 [&_svg]:size-5" aria-hidden="true"><Store /></span>
              <h3 className="mt-4 text-[17px] font-semibold text-neutral-900">{t("Kelola Vendor")}</h3>
              <p className="mt-1 text-[14px] leading-6 text-neutral-600">{t("Dari prospek sampai deal, bandingkan paket, dan chat WhatsApp langsung.")}</p>
              <div aria-hidden="true" className="mt-4 flex gap-1.5 text-[11px] font-medium">
                {[[t("Prospek"), "bg-neutral-100 text-neutral-600"], [t("Negosiasi"), "bg-caution-bg text-caution"], [t("Deal"), "bg-plum-600 text-white"]].map(([l, c]) => <span key={l} className={`rounded-full px-2.5 py-1 ${c}`}>{l}</span>)}
              </div>
              <ul aria-hidden="true" className="mt-4 space-y-2">
                {[[t("Katering"), "Rp 15.000.000", t("DP dibayar")], [t("Fotografer"), "Rp 8.500.000", t("Menunggu DP")]].map(([n, v, s]) => (
                  <li key={n} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-[12px]">
                    <span className="min-w-0 text-neutral-800">{n}<span className="tabular ml-2 whitespace-nowrap text-neutral-500">{v}</span></span>
                    <span className="shrink-0 text-neutral-500">{s}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="hover-lift reveal rounded-2xl border border-neutral-200/80 bg-surface p-6 shadow-card md:col-span-2">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-plum-100 text-plum-700 [&_svg]:size-5" aria-hidden="true"><CalendarDays /></span>
              <h3 className="mt-4 text-[17px] font-semibold text-neutral-900">{t("Reminder & Calendar")}</h3>
              <p className="mt-1 text-[14px] leading-6 text-neutral-600">{t("Tugas, pembayaran vendor, acara, dan agenda. Masuk ke Google Calendar dan notifikasi HP.")}</p>
              <div aria-hidden="true" className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-500">
                {Array.from({ length: 14 }, (_, i) => <span key={i} className={[3, 8, 11].includes(i) ? "rounded-md bg-plum-600 py-1 font-semibold text-white" : "rounded-md bg-neutral-50 py-1"}>{i + 1}</span>)}
              </div>
              <p aria-hidden="true" className="mt-3 flex items-center gap-1.5 text-[11px] text-neutral-500"><span className="size-2 rounded-full bg-plum-600" />{t("Tugas, pembayaran, dan acara")}</p>
            </article>

            <article className="hover-lift reveal rounded-2xl border border-neutral-200/80 bg-surface p-6 shadow-card md:col-span-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-plum-100 text-plum-700 [&_svg]:size-5" aria-hidden="true"><PartyPopper /></span>
              <h3 className="mt-4 text-[17px] font-semibold text-neutral-900">{t("Mode Hari H")}</h3>
              <p className="mt-1 text-[14px] leading-6 text-neutral-600">{t("Rundown yang berjalan sesuai jam, kontak vendor sekali ketuk, dan check-in tamu dengan QR, juga lewat tautan panitia.")}</p>
              <div aria-hidden="true" className="mt-5 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2">
                <div className="rounded-xl bg-plum-700 p-3 text-white">
                  <p className="text-[9px] font-bold tracking-widest text-white/70 uppercase">{t("Sekarang")}</p>
                  <p className="tabular mt-1 text-[13px] font-bold">19.00 - 19.30</p>
                  <p className="truncate text-[13px] font-semibold">{t("Kirab pengantin")}</p>
                </div>
                <div className="rounded-xl bg-plum-50 p-3">
                  <p className="flex items-center gap-1 text-[10px] font-medium text-neutral-600"><ScanLine className="size-3 text-plum-600" />{t("Hadir di lokasi")}</p>
                  <p className="tabular mt-1 text-[18px] font-bold text-neutral-900">214<span className="text-[11px] font-semibold text-neutral-500"> / 300</span></p>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-plum-100"><div className="h-full w-[71%] rounded-full bg-plum-600" /></div>
                </div>
              </div>
            </article>

            <article className="hover-lift reveal rounded-2xl border border-neutral-200/80 bg-surface p-6 shadow-card md:col-span-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-plum-100 text-plum-700 [&_svg]:size-5" aria-hidden="true"><HandCoins /></span>
              <h3 className="mt-4 text-[17px] font-semibold text-neutral-900">{t("Amplop & Kado")}</h3>
              <p className="mt-1 text-[14px] leading-6 text-neutral-600">{t("Catat amplop, transfer, dan kado dari tamu, lalu kirim ucapan terima kasih lewat WhatsApp.")}</p>
              <ul aria-hidden="true" className="mt-4 space-y-2">
                {[["Bapak Hendra", t("Amplop"), "Rp 200.000", true], ["Keluarga Siregar", t("Kado"), t("Set piring"), false]].map(([n, k, v, done]) => (
                  <li key={n as string} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-[12px]">
                    <span className="min-w-0 truncate text-neutral-800">{n}<span className="ml-2 text-neutral-500">{k} · {v}</span></span>
                    <span className={done ? "shrink-0 rounded-full bg-plum-100 px-2 py-0.5 font-medium text-plum-700" : "shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600"}>{done ? t("Sudah") : t("Kirim ucapan")}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <ul className="stagger mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.filter((f) => ["Dashboard", "Rundown Hari H", "Mahar & Seserahan", "Dokumen Penting", "Pengaturan Pernikahan", "Panduan Penggunaan"].includes(f.title)).map((f) => (
              <li key={f.title} className="flex items-start gap-3.5 rounded-xl border border-neutral-200/80 bg-surface p-4">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-plum-100 text-plum-700 [&_svg]:size-[18px]" aria-hidden="true">{f.icon}</span>
                <span><span className="block text-[14px] font-semibold text-neutral-900">{t(f.title)}</span><span className="mt-0.5 block text-[13px] leading-5 text-neutral-600">{t(f.text)}</span></span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pasang di HP */}
        <section id="pasang" aria-labelledby="pasang-title" className="scroll-mt-20 border-y border-plum-100/80 bg-surface/50">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:py-24 lg:gap-14">
            <div className="reveal">
              <p className={`${eyebrow} md:mx-0 md:before:hidden`}>{t("Pasang di HP")}</p>
              <h2 id="pasang-title" className="[font-variant-numeric:lining-nums] mt-3 text-center font-display text-[34px] leading-[1.1] font-medium text-neutral-900 md:text-left md:text-[44px]">
                {t("Seperti aplikasi,")} <em className={em}>{t("tanpa unduh dari toko.")}</em>
              </h2>
              <p className="mt-4 text-center text-[15px] leading-7 text-neutral-600 md:text-left">{t("Monaplan bisa dipasang di layar utama HP Android maupun iPhone, langsung dari browser. Gratis, ringan, dan tidak memakan memori seperti aplikasi biasa.")}</p>
              <ul className="mx-auto mt-6 max-w-md space-y-3 md:mx-0">
                {[
                  [<BellRing key="a" />, t("Pengingat DP, pelunasan, dan tugas muncul sebagai notifikasi di HP")],
                  [<Mail key="b" />, t("Kabar langsung saat tamu mengonfirmasi hadir")],
                  [<ScanLine key="c" />, t("Siap dipakai untuk check-in tamu di hari H")],
                ].map(([icon, text], i) => (
                  <li key={i} className="flex items-start gap-3 text-[14.5px] leading-6 text-neutral-700">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-plum-100 text-plum-700 [&_svg]:size-4" aria-hidden="true">{icon}</span>{text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal">
              <InstallGuide qrPath="/" />
            </div>
          </div>
        </section>

        {/* Peran */}
        <section aria-labelledby="peran-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <SectionHead id="peran-title" label={t("Bekerja bersama")} sub={t("Pemilik, pasangan, keluarga, dan tamu punya akses yang berbeda, jadi data tetap rapi dan aman.")}>
            {t("Satu ruang kerja,")} <em className={em}>{t("semua ikut pegang bagiannya.")}</em>
          </SectionHead>
          <RolesTabs />
        </section>

        {/* Harga dan bonus */}
        {pricedPlans.length > 0 && (
          <section id="harga" aria-labelledby="harga-title" className="scroll-mt-20 border-y border-plum-100/80 bg-surface/50">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
              <SectionHead id="harga-title" label={t("Mulai hari ini")} sub={t("Bayar sekali, akses tetap milikmu, dan dua bonus ikut aktif tanpa biaya tambahan.")}>
                {t("Bayar sekali,")} <em className={em}>{t("pakai selamanya.")}</em>
              </SectionHead>
              <PricingBonus plans={pricedPlans} trialDays={trialDays} loggedIn={loggedIn} buyHref={buyHref} />
            </div>
          </section>
        )}

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
            <div className="reveal lg:sticky lg:top-28 lg:self-start">
              <p className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-plum-600 uppercase before:h-px before:w-6 before:bg-plum-300">{t("Tanya jawab")}</p>
              <h2 id="faq-title" className="[font-variant-numeric:lining-nums] mt-3 font-display text-[34px] leading-[1.1] font-medium text-neutral-900 md:text-[44px]">{t("Pertanyaan yang sering")} <em className={em}>{t("muncul.")}</em></h2>
              <p className="mt-4 max-w-sm text-[15px] leading-7 text-neutral-600">{t("Belum menemukan jawabannya? Tanyakan langsung, kami balas secepatnya.")}</p>
              {wa && <ButtonLink href={wa} variant="outline" className="mt-5" target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="text-[#1FA855]" />{t("Chat WhatsApp admin")}</ButtonLink>}
            </div>
            <div className="flex flex-col gap-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-neutral-200/80 bg-surface px-5 py-4 shadow-card open:border-plum-200">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-neutral-900">
                    <h3>{t(f.q)}</h3>
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-plum-100 text-plum-700 transition-transform duration-200 group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">{t(f.a)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Ajakan penutup */}
        <section aria-labelledby="penutup-title" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
          <div className="brand-canvas reveal relative overflow-hidden rounded-3xl px-6 py-14 text-center text-white shadow-modal md:px-12">
            <h2 id="penutup-title" className="[font-variant-numeric:lining-nums] mx-auto max-w-2xl font-display text-[34px] leading-[1.1] font-medium md:text-[48px]">{t("Satu tugas kecil dulu.")} <em className="italic text-[#EDD1DF]">{t("Sisanya menyusul.")}</em></h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-white/80">{t("Isi data pernikahanmu, dan checklist rekomendasi langsung siap dikerjakan bersama pasangan.")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href={startHref} variant="white" size="lg">{loggedIn ? t("Buka Dashboard") : (trialLabel ?? t("Mulai Merencanakan"))}<ArrowRight className="ml-0.5" /></ButtonLink>
              {plans.length > 0 && <a href="#harga" className="inline-flex h-12 items-center rounded-full border border-white/30 px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/10">{t("Lihat harga")}</a>}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-[13px] text-neutral-500 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-center">{t(SITE.slogan)}</p>
          <p>© {new Date().getFullYear()} {SITE.name} · <Link href="/privasi" className="hover:text-plum-600">{t("Kebijakan privasi")}</Link></p>
        </div>
      </footer>
      <AnimationGate />
      <BackToTop />
      <Suspense fallback={null}><PromoPopupLoader plans={plans} /></Suspense>
    </div>
  );
}
