import { ImageResponse } from "next/og";
import { LOGO_PATH_HEART, LOGO_PATH_M } from "@/components/app/logo-mark";
import { IPHONE_SCREENS, screenId } from "@/lib/pwa-splash";

// Layar pembuka iPhone (apple-touch-startup-image). iOS tidak membuat layar pembuka dari manifest seperti Android,
// jadi tanpa gambar ini layar hitam/putih tampil selama HTML pertama dimuat. Posisi logo sama dengan splash HTML
// (components/app/splash.tsx) agar peralihannya mulus.
const VARIANTS = IPHONE_SCREENS.flatMap((s) => [screenId(s), `${screenId(s)}-dark`]);

export const dynamic = "force-static";
export function generateStaticParams() {
  return VARIANTS.map((variant) => ({ variant }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const variant = (await params).variant;
  const m = /^(\d+)x(\d+)@(\d)(-dark)?$/.exec(variant);
  if (!m || !VARIANTS.includes(variant)) return new Response("Not found", { status: 404 });
  const r = Number(m[3]);
  const width = Number(m[1]) * r, height = Number(m[2]) * r;
  const logo = 88 * r;
  // Kolom splash: logo 88, jarak 18, nama ±36, jarak 22, bar 4 = ±168 px, dipusatkan; pusat logo 40 px di atas tengah layar
  const top = Math.round(height / 2 - 40 * r - logo / 2);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", background: m[4] ? "#130E11" : "#FBF5F8" }}>
      <svg width={logo} height={logo} viewBox="0 0 48 48" style={{ marginTop: top }}>
        <defs><linearGradient id="g" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#B8638D" /><stop offset="1" stopColor="#4A1D36" /></linearGradient></defs>
        <rect width="48" height="48" rx="13.5" fill="url(#g)" />
        <path d={LOGO_PATH_M} fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d={LOGO_PATH_HEART} fill="#F3C969" />
      </svg>
    </div>,
    { width, height, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
