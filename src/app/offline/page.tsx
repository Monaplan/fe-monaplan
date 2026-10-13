import { WifiOff } from "lucide-react";
import { LogoMark } from "@/components/app/logo-mark";
import { NOINDEX } from "@/lib/seo";
import { RetryButton } from "./retry-button";

export const dynamic = "force-static";
export const metadata = { title: "Offline", robots: NOINDEX };

// Halaman cadangan service worker saat tidak ada sinyal. Statis dan dua bahasa karena disimpan sekali di perangkat.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-canvas px-6 text-center">
      <LogoMark className="size-12" />
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-plum-100 text-plum-700"><WifiOff className="size-7" /></span>
      <div>
        <h1 className="text-[22px] font-semibold text-neutral-900">Kamu sedang offline</h1>
        <p className="mt-1 text-[14px] text-neutral-600">Periksa sinyal atau Wi-Fi, lalu coba lagi.</p>
        <p className="mt-3 text-[13px] text-neutral-500" lang="en">You are offline. Check your connection and try again.</p>
      </div>
      <RetryButton />
    </main>
  );
}
