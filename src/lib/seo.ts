import type { Metadata } from "next";

// Satu sumber kebenaran untuk SEO (lihat PRD bagian 16)
export const SITE = {
  name: "Monaplan",
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  title: "Monaplan: Aplikasi Wedding Planner Digital untuk Calon Pengantin",
  shortTitle: "Monaplan: Digital Wedding Planner",
  description:
    "Aplikasi wedding planner all-in-one: checklist persiapan nikah, budgeting, kelola vendor, daftar tamu dan RSVP via WhatsApp, rundown hari H, mahar dan seserahan, hingga dokumen KUA dalam satu dashboard.",
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
  "/w/", "/admin", "/akun", "/aktivasi", "/onboarding", "/checkout", "/gabung/", "/rsvp/", "/mulai",
  "/reset-password", "/lupa-password", "/auth/", "/api/",
];

export function pageMetadata({ title, description, path, noindex }: { title?: string; description?: string; path: string; noindex?: boolean }): Metadata {
  const t = title ?? SITE.title;
  const d = description ?? SITE.description;
  return {
    title: title ? title : { absolute: SITE.title },
    description: d,
    alternates: { canonical: path },
    openGraph: { title: t, description: d, url: path, type: "website", siteName: SITE.name, locale: SITE.locale },
    twitter: { card: "summary_large_image", title: t, description: d },
    ...(noindex ? { robots: NOINDEX } : {}),
  };
}

// Escape aman untuk JSON-LD di dalam <script>
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
