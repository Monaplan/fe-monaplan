import type { NextConfig } from "next";

// Kebijakan konten. Dipasang sebagai Report-Only dulu: pelanggaran hanya dilaporkan di konsol peramban dan tidak memblokir,
// sehingga Snap Midtrans, Supabase, dan Google tidak rusak. Setelah diperiksa bersih, ganti nama header menjadi
// "Content-Security-Policy" untuk memberlakukannya. 'unsafe-inline' dibutuhkan skrip bawaan Next dan skrip tema.
const filesOrigin = (() => { try { return process.env.FILES_BASE_URL ? new URL(process.env.FILES_BASE_URL).origin : ""; } catch { return ""; } })();
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"} https://*.midtrans.com https://pay.google.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.midtrans.com ${filesOrigin}`.trim(),
  "frame-src https://*.midtrans.com https://pay.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Jumlah pekerja build dibatasi: pada mesin dengan banyak inti tetapi memori terbatas, 15 pekerja sekaligus membuat build kehabisan memori
  experimental: { cpus: 4 },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  async redirects() {
    // Alamat ruang kerja lama /w/... dialihkan permanen; /app/<uuid> lalu diteruskan ke slug oleh layout
    return [{ source: "/w/:path*", destination: "/app/:path*", permanent: true }];
  },
  async headers() {
    // Halaman privat dan token: jangan diindeks walau tautannya bocor ke publik
    const noindex = [
      "/app/:path*", "/w/:path*", "/admin/:path*", "/admin", "/akun/:path*", "/akun", "/aktivasi", "/onboarding", "/checkout/:path*",
      "/gabung/:path*", "/rsvp/:path*", "/mulai", "/reset-password", "/lupa-password", "/auth/:path*", "/api/:path*",
    ].map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }));
    return [
      ...noindex,
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self), interest-cohort=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
