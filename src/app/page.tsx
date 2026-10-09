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
import { ThemeToggle } from "@/components/app/theme";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ path: "/" });

const FEATURES = [
  { icon: <LayoutGrid />, title: "Dashboard", text: "Hitung mundur, budget terpakai, tamu hadir, dan agenda 14 hari ke depan dalam satu layar." },
  { icon: <SlidersHorizontal />, title: "Pengaturan Pernikahan", text: "Data pasangan, daftar acara akad hingga resepsi, budget, target tamu, dan kolaborator." },
  { icon: <BookOpen />, title: "Panduan Penggunaan", text: "Delapan langkah berurutan yang otomatis tercentang saat kalian mengisinya." },
  { icon: <ListChecks />, title: "To Do Checklist", text: "Checklist persiapan nikah per fase dengan due date dihitung mundur dari hari H." },
  { icon: <Wallet />, title: "Budgeting", text: "Alokasi per kategori, realisasi, jadwal DP dan pelunasan, serta peringatan saat melebihi budget." },
  { icon: <Store />, title: "Kelola Vendor", text: "Pipeline prospek sampai deal, perbandingan paket vendor, dan chat WhatsApp langsung." },
  { icon: <Mail />, title: "Tamu & RSVP", text: "Link RSVP pribadi per tamu, kirim undangan via WhatsApp, rekap kehadiran otomatis." },
  { icon: <Clock />, title: "Rundown Hari H", text: "Susunan acara per sesi dengan PIC, lokasi, dan deteksi jadwal bertabrakan." },
  { icon: <Gift />, title: "Mahar & Seserahan", text: "Daftar item, harga, link toko, dan progres pembelian." },
  { icon: <FileText />, title: "Dokumen Penting", text: "Checklist dokumen nikah KUA atau catatan sipil dan arsip berkas di penyimpanan privat." },
  { icon: <CalendarDays />, title: "Reminder & Calendar", text: "Tugas, jatuh tempo pembayaran vendor, acara, dan agenda manual dalam satu kalender, bisa disinkronkan ke Google Calendar." },
];

const STEPS = [
  { title: "Daftar dan mulai", text: "Masuk dengan email atau Google. Coba dulu, atau aktifkan dengan paket atau kode akses." },
  { title: "Isi data pernikahan", text: "Nama pasangan, tanggal, kota, dan budget. Checklist rekomendasi langsung dibuat." },
  { title: "Rencanakan bersama", text: "Undang pasangan atau keluarga, catat vendor, dan kirim undangan RSVP lewat WhatsApp." },
];

const FAQ = [
  { q: "Apa itu Monaplan?", a: "Monaplan adalah aplikasi wedding planner digital untuk calon pengantin di Indonesia. Checklist, budget, vendor, tamu dan RSVP, rundown, mahar dan seserahan, dokumen, serta pengingat dikelola dari satu dashboard." },
  { q: "Apakah bisa dipakai bersama pasangan atau keluarga?", a: "Bisa. Pemilik ruang kerja dapat mengundang hingga 3 kolaborator sebagai Editor atau Viewer tanpa mereka perlu membeli akses sendiri." },
  { q: "Bagaimana tamu mengonfirmasi kehadiran?", a: "Setiap tamu mendapat link RSVP pribadi yang dikirim lewat WhatsApp. Tamu cukup memilih hadir, tidak hadir, atau masih ragu tanpa perlu membuat akun, dan rekapnya langsung terbarui." },
  { q: "Berapa lama akses setelah membayar?", a: "Selamanya. Cukup sekali bayar, tanpa langganan dan tanpa biaya perpanjangan." },
  { q: "Apakah ada masa coba gratis?", a: "Ada, selama fitur trial aktif. Akun baru bisa langsung mencoba semua modul tanpa memilih paket dan tanpa kartu kredit. Setelah trial berakhir, data tetap aman dan bisa dilihat; aktifkan akses selamanya untuk kembali mengedit." },
  { q: "Bisakah jadwal dari Monaplan muncul di Google Calendar?", a: "Bisa. Hubungkan akun Google dari halaman Reminder & Calendar, dan tugas, jatuh tempo pembayaran, acara, serta agenda akan disinkronkan ke kalender khusus Monaplan di akunmu." },
  { q: "Apakah data pernikahan kami aman?", a: "Data setiap ruang kerja dipisahkan di tingkat database, berkas disimpan di penyimpanan privat, dan pengolahan data mengikuti UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi." },
  { q: "Apa yang terjadi bila masa trial habis?", a: "Data tetap aman dan bisa dilihat serta diekspor. Kalian hanya perlu mengaktifkan akses selamanya untuk kembali mengedit. Halaman RSVP tamu tetap berjalan 30 hari setelah masa trial habis." },
];

export default async function LandingPage() {
  let plans: any[] = [];
  let loggedIn = false;
  let trialDays: number | null = null;
  let priced: Record<string, ReturnType<typeof priceFor>> = {};
  try {
    const supabase = await createClient();
    const [{ data }, settings, ctx] = await Promise.all([
      supabase.from("plans").select("*").eq("type", "lifetime").order("sort_order"),
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
  const trialLabel = trialDays ? `Coba Gratis ${trialDays} Hari` : null;

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
        featureList: FEATURES.map((f) => f.title),
        ...(plans.length && {
          offers: plans.map((p) => ({ "@type": "Offer", name: p.name, price: priced[p.id]?.final ?? p.price_idr, priceCurrency: "IDR", availability: "https://schema.org/InStock", url: `${SITE.url}/login?mode=daftar` })),
        }),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <div className="min-h-dvh bg-plum-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav aria-label="Navigasi utama" className="flex items-center gap-1 sm:gap-2">
          <a href="#fitur" className="hidden rounded-full px-3 py-2 text-sm text-neutral-700 hover:text-plum-700 sm:block">Fitur</a>
          {plans.length > 0 && <a href="#harga" className="hidden rounded-full px-3 py-2 text-sm text-neutral-700 hover:text-plum-700 sm:block">Harga</a>}
          <a href="#faq" className="hidden rounded-full px-3 py-2 text-sm text-neutral-700 hover:text-plum-700 sm:block">FAQ</a>
          <ThemeToggle />
          {loggedIn ? (
            <ButtonLink href="/mulai" variant="dark">Buka Dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost">Masuk</ButtonLink>
              <ButtonLink href="/login?mode=daftar" variant="dark">{trialLabel ?? "Daftar"}</ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main>
        <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pt-10 pb-16 text-center sm:px-6 md:pt-16">
          {trialDays && !loggedIn ? (
            <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-plum-700 shadow-card ring-1 ring-plum-100">
              <Sparkles className="size-4" aria-hidden="true" />Coba gratis {trialDays} hari, tanpa kartu kredit
            </p>
          ) : (
            <p className="text-[11px] font-semibold tracking-[0.12em] text-plum-600 uppercase">Aplikasi Wedding Planner Digital</p>
          )}
          <h1 id="hero-title" className="mx-auto mt-3 max-w-3xl font-display text-[40px] leading-[48px] font-medium text-neutral-900 md:text-[56px] md:leading-[64px]">
            Semua persiapan pernikahan, <em className="text-plum-600">tenang</em> dalam satu tempat.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-6 text-neutral-600">
            Checklist persiapan nikah, budget, vendor, daftar tamu dan RSVP via WhatsApp, rundown, mahar dan seserahan, hingga dokumen KUA. Dikerjakan bersama pasangan dan keluarga.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={loggedIn ? "/mulai" : "/login?mode=daftar"} size="lg">{loggedIn ? "Mulai Merencanakan" : (trialLabel ?? "Mulai Merencanakan")}</ButtonLink>
            <ButtonLink href="#fitur" size="lg" variant="outline">Lihat Fitur</ButtonLink>
          </div>
        </section>

        <section id="fitur" aria-labelledby="fitur-title" className="mx-auto max-w-6xl scroll-mt-6 px-4 pb-16 sm:px-6">
          <h2 id="fitur-title" className="mb-2 text-center font-display text-[32px] leading-10 font-medium text-neutral-900">11 modul persiapan pernikahan yang saling terhubung</h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-neutral-600">Vendor yang sudah deal otomatis masuk ke budget, jadwal DP dan pelunasan muncul di kalender, dan RSVP tamu langsung terekap.</p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="hover-lift reveal rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-card">
                <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-plum-100 text-plum-700 [&_svg]:size-5" aria-hidden="true">{f.icon}</span>
                <h3 className="text-base font-semibold text-neutral-900">{f.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-neutral-600">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="cara-title" className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <h2 id="cara-title" className="mb-8 text-center font-display text-[32px] leading-10 font-medium text-neutral-900">Cara memulai</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="hover-lift reveal rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-card">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-plum-600 text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-3 text-base font-semibold text-neutral-900">{s.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-neutral-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {sortedPlans.length > 0 && (
          <section id="harga" aria-labelledby="harga-title" className="mx-auto max-w-4xl scroll-mt-6 px-4 pb-16 sm:px-6">
            <h2 id="harga-title" className="mb-8 text-center font-display text-[32px] leading-10 font-medium text-neutral-900">Harga paket</h2>
            <div className={sortedPlans.length > 1 ? "grid gap-4 md:grid-cols-2" : "mx-auto grid max-w-md gap-4"}>
              {sortedPlans.map((p) => {
                const price = priced[p.id] ?? priceFor(p, [], false);
                const promo = price.promo;
                return (
                <article key={p.id} className="hover-lift reveal rounded-2xl border-2 border-plum-600 bg-surface p-6 shadow-card">
                  <h3 className="text-base font-semibold text-neutral-900">{p.name}</h3>
                  {promo && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-caution-bg px-2.5 py-1 text-xs font-medium text-caution">
                      <Tag className="size-3" aria-hidden="true" />{promo.name}{promo.ends_at && ` · sampai ${formatDateCompact(promo.ends_at)}`}
                    </p>
                  )}
                  <p className="tabular mt-2 text-[32px] leading-10 font-bold text-neutral-900">
                    {formatIDR(price.final)}
                    {promo && <s className="ml-2 text-base font-medium text-neutral-500">{formatIDR(price.original)}</s>}
                  </p>
                  <p className="text-[13px] text-neutral-600">Sekali bayar, akses selamanya</p>
                  <ul className="mt-4 space-y-2 text-sm text-neutral-700">
                    {["Semua 11 modul", `Hingga ${p.max_collaborators} kolaborator`, "Halaman RSVP untuk tamu", "Sinkron ke Google Calendar"].map((x) => (
                      <li key={x} className="flex items-center gap-2"><Check className="size-4 text-plum-600" aria-hidden="true" />{x}</li>
                    ))}
                  </ul>
                  {trialDays && !loggedIn && (
                    <ButtonLink href="/login?mode=daftar" variant="outline" className="mt-5 w-full">Coba dulu {trialDays} hari gratis</ButtonLink>
                  )}
                </article>
                );
              })}
            </div>
          </section>
        )}

        <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl scroll-mt-6 px-4 pb-20 sm:px-6">
          <h2 id="faq-title" className="mb-8 text-center font-display text-[32px] leading-10 font-medium text-neutral-900">Pertanyaan yang sering diajukan</h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-neutral-200/80 bg-surface px-5 py-4 shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-neutral-900">
                  <h3>{f.q}</h3>
                  <span className="text-plum-600 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 py-6 text-center text-[13px] text-neutral-500">
        © {new Date().getFullYear()} {SITE.name} · <Link href="/privasi" className="hover:text-plum-600">Kebijakan privasi</Link>
      </footer>
    </div>
  );
}
