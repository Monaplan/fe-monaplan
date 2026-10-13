import { ImageResponse } from "next/og";
import { LOGO_PATH_HEART, LOGO_PATH_M } from "@/components/app/logo-mark";
import { IPHONE_SCREENS, screenId } from "@/lib/pwa-splash";

// Layar pembuka iPhone (apple-touch-startup-image). iOS tidak membuat layar pembuka dari manifest seperti Android,
// jadi tanpa gambar ini layar hitam/putih tampil selama HTML pertama dimuat. Posisi logo sama dengan splash HTML
// (components/app/splash.tsx) agar peralihannya mulus.
const VARIANTS = IPHONE_SCREENS.map(screenId);

export const dynamic = "force-static";
export function generateStaticParams() {
  return VARIANTS.map((variant) => ({ variant }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const variant = (await params).variant;
  const m = /^(\d+)x(\d+)@(\d)$/.exec(variant);
  if (!m || !VARIANTS.includes(variant)) return new Response("Not found", { status: 404 });
  const r = Number(m[3]);
  const width = Number(m[1]) * r, height = Number(m[2]) * r;
  const logo = 88 * r;
  // Pusat logo tepat di tengah layar penuh; splash HTML menyesuaikan ke titik ini (--mp-splash-y)
  const top = Math.round(height / 2 - logo / 2);
  // Logo dengan bayangan yang sama, lalu jalur bar loading kosong (logo 88 + jarak 18 + nama 36 + jarak 22) agar halaman pembuka tinggal mengisi
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", background: "#FBF5F8" }}>
      <div style={{ display: "flex", marginTop: top, width: logo, height: logo, borderRadius: 13.5 * (logo / 48), boxShadow: `0 ${12 * r}px ${24 * r}px rgba(74, 29, 54, 0.22)` }}>
        <svg width={logo} height={logo} viewBox="0 0 48 48">
          <defs><linearGradient id="g" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#B8638D" /><stop offset="1" stopColor="#4A1D36" /></linearGradient></defs>
          <rect width="48" height="48" rx="13.5" fill="url(#g)" />
          <path d={LOGO_PATH_M} fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d={LOGO_PATH_HEART} fill="#F3C969" />
        </svg>
      </div>
      <div style={{ display: "flex", marginTop: (18 + 36 + 22) * r, width: 148 * r, height: 4 * r, borderRadius: 999, background: "#EDD1DF" }} />
    </div>,
    { width, height, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
