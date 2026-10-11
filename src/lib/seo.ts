import type { Metadata } from "next";

// Satu sumber kebenaran untuk SEO (lihat PRD bagian 16)
export const SITE = {
  name: "Monaplan",
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  slogan: "Satu tempat untuk semua rencana nikahmu",
  title: "Monaplan: Satu tempat untuk semua rencana nikahmu",
  shortTitle: "Monaplan: Satu tempat untuk semua rencana nikahmu",
  description:
    "Aplikasi wedding planner untuk persiapan nikah: checklist, budget, vendor, tamu dan RSVP WhatsApp, rundown hari H, sampai dokumen KUA. Coba gratis.",
  keywords: [
    "wedding planner", "aplikasi wedding planner", "checklist persiapan pernikahan", "budget pernikahan",
    "daftar tamu pernikahan", "RSVP online", "undangan WhatsApp", "rundown pernikahan", "mahar dan seserahan",
    "dokumen nikah KUA", "persiapan nikah",
  ],
  locale: "id_ID",
  themeColor: "#8C3A63",
};

// Halaman privat: jangan diindeks dan jangan diikuti tautannya
export const NOINDEX: Metadata["robots"] = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } };

// Path yang tidak boleh dirayapi (robots.txt) dan diberi header X-Robots-Tag: noindex
export const PRIVATE_PATHS = [
  "/app/", "/w/", "/admin", "/akun", "/aktivasi", "/onboarding", "/checkout", "/gabung/", "/rsvp/", "/mulai",
  "/reset-password", "/lupa-password", "/auth/", "/api/",
];

// tr: fungsi terjemah (getT) agar judul dan deskripsi mengikuti bahasa pengunjung
export function pageMetadata({ title, description, path, noindex, tr }: { title?: string; description?: string; path: string; noindex?: boolean; tr?: (s: string) => string }): Metadata {
  const x = tr ?? ((s: string) => s);
  const t = title ? x(title) : x(SITE.title);
  const d = x(description ?? SITE.description);
  return {
    title: title ? x(title) : { absolute: x(SITE.title) },
    description: d,
    alternates: { canonical: path },
    // Gambar dicantumkan eksplisit: openGraph di halaman menimpa seluruh openGraph induk, termasuk gambar bawaannya
    openGraph: { title: t, description: d, url: path, type: "website", siteName: SITE.name, locale: SITE.locale, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE.name }] },
    twitter: { card: "summary_large_image", title: t, description: d, images: ["/opengraph-image"] },
    ...(noindex ? { robots: NOINDEX } : {}),
  };
}

// Escape aman untuk JSON-LD di dalam <script>
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
