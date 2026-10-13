import { ImageResponse } from "next/og";

// Ikon PWA: 192 dan 512 (sudut membulat), maskable 512 (penuh, lambang di area aman 80%), dan badge monokrom untuk notifikasi Android
const VARIANTS: Record<string, { size: number; maskable?: boolean; badge?: boolean }> = {
  "192": { size: 192 }, "512": { size: 512 }, "maskable-512": { size: 512, maskable: true }, "badge-96": { size: 96, badge: true },
};

export const dynamic = "force-static";
export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

const MARK = "M13 36V20.2a3.3 3.3 0 0 1 5.7-2.3L24 24.2l5.3-6.3A3.3 3.3 0 0 1 35 20.2V36";
const HEART = "M24 17.6c-3.9-2.5-5.7-4.4-5.7-6.6a3.1 3.1 0 0 1 5.7-1.7 3.1 3.1 0 0 1 5.7 1.7c0 2.2-1.8 4.1-5.7 6.6z";

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const v = VARIANTS[(await params).variant];
  if (!v) return new Response("Not found", { status: 404 });
  const s = v.size;
  const svg = v.badge ? (
    <svg width={s} height={s} viewBox="0 0 48 48"><path d={MARK} fill="none" stroke="#FFFFFF" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" /><path d={HEART} fill="#FFFFFF" /></svg>
  ) : (
    <svg width={s} height={s} viewBox={v.maskable ? "-6 -6 60 60" : "0 0 48 48"}>
      <defs><linearGradient id="g" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#B8638D" /><stop offset="1" stopColor="#4A1D36" /></linearGradient></defs>
      {v.maskable ? <rect x="-6" y="-6" width="60" height="60" fill="url(#g)" /> : <rect width="48" height="48" rx="10.5" fill="url(#g)" />}
      <path d={MARK} fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /><path d={HEART} fill="#F3C969" />
    </svg>
  );
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex" }}>{svg}</div>, {
    width: s, height: s, headers: { "Cache-Control": "public, max-age=604800, immutable" },
  });
}
