import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  async headers() {
    // Halaman privat dan token: jangan diindeks walau tautannya bocor ke publik
    const noindex = [
      "/w/:path*", "/admin/:path*", "/admin", "/akun/:path*", "/akun", "/aktivasi", "/onboarding", "/checkout/:path*",
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
        ],
      },
    ];
  },
};

export default nextConfig;
