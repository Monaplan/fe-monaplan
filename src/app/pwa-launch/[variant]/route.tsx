import { ImageResponse } from "next/og";
import { IPHONE_SCREENS, screenId } from "@/lib/pwa-splash";

// Layar pembuka iPhone (apple-touch-startup-image). iOS tidak membuat layar pembuka dari manifest seperti Android,
// jadi tanpa gambar ini layar hitam tampil selama halaman pertama dimuat. Isinya hanya warna latar splash.
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
  // Sengaja polos: posisi logo di gambar bawaan iOS tidak bisa disamakan dengan pasti dengan halaman web
  // (acuan layarnya berbeda), jadi logo hanya tampil di halaman pembuka dan splash aplikasi yang memakai CSS yang sama
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#FBF5F8" }} />,
    { width, height, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
