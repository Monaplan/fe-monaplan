import { cn } from "@/components/ui/cn";

// Lambang Monaplan: huruf M berlekuk lembut (dua puncak membulat) dengan hati kecil di lekuknya.
// tone "brand": kotak plum bergradasi dengan M putih dan hati emas. tone "light": kotak putih dengan M plum, untuk latar gelap.
// Ukuran mengikuti kelas pemanggil (mis. size-9).
export const LOGO_PATH_M = "M13 36V20.2a3.3 3.3 0 0 1 5.7-2.3L24 24.2l5.3-6.3A3.3 3.3 0 0 1 35 20.2V36";
export const LOGO_PATH_HEART = "M24 17.6c-3.9-2.5-5.7-4.4-5.7-6.6a3.1 3.1 0 0 1 5.7-1.7 3.1 3.1 0 0 1 5.7 1.7c0 2.2-1.8 4.1-5.7 6.6z";

export function LogoMark({ className, tone = "brand" }: { className?: string; tone?: "brand" | "light" }) {
  const light = tone === "light";
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("shrink-0", className)}>
      {!light && (
        <defs>
          <linearGradient id="mp-mark-g" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#B8638D" />
            <stop offset="1" stopColor="#4A1D36" />
          </linearGradient>
        </defs>
      )}
      <rect width="48" height="48" rx="13.5" fill={light ? "#FFFFFF" : "url(#mp-mark-g)"} />
      <path d={LOGO_PATH_M} fill="none" stroke={light ? "#3E1A2D" : "#FFFFFF"} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={LOGO_PATH_HEART} fill={light ? "#B8638D" : "#F3C969"} />
    </svg>
  );
}
