import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { jakarta, cormorant } from "./fonts";
import { ToastProvider } from "@/components/ui/toast";
import { DialogProvider } from "@/components/ui/dialogs";
import { ThemeSync } from "@/components/app/theme";
import { SwRegister } from "@/components/app/sw-register";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { SPLASH_END, SPLASH_HEAD } from "@/lib/splash-script";
import { Splash } from "@/components/app/splash";
import { I18nProvider } from "@/i18n/client";
import { getLang } from "@/i18n/server";
import { EN } from "@/i18n/en";
import { SITE } from "@/lib/seo";
import { startupImages } from "@/lib/pwa-splash";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.shortTitle, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: SITE.keywords,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "lifestyle",
  formatDetection: { telephone: false, email: false, address: false },
  // Dibuka dari layar utama iPhone: tampil penuh seperti aplikasi, splash Monaplan menggantikan layar putih
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "default", startupImage: startupImages() },
  // Next hanya menulis mobile-web-app-capable; iOS masih butuh versi apple agar gambar layar pembuka dipakai
  other: { "apple-mobile-web-app-capable": "yes" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: { card: "summary_large_image", title: SITE.title, description: SITE.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: SITE.themeColor },
    { media: "(prefers-color-scheme: dark)", color: "#1C1519" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${jakarta.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SPLASH_HEAD }} />
      </head>
      <body>
        <Splash />
        <I18nProvider lang={lang} dict={lang === "en" ? EN : undefined}>
          <ToastProvider>
            <DialogProvider>{children}</DialogProvider>
            <ThemeSync />
            <SwRegister />
          </ToastProvider>
        </I18nProvider>
        {/* Statistik pengunjung dan kecepatan halaman milik Vercel; hanya aktif di situs yang di-deploy ke Vercel */}
        <Analytics />
        <SpeedInsights />
        <script dangerouslySetInnerHTML={{ __html: SPLASH_END }} />
      </body>
    </html>
  );
}
