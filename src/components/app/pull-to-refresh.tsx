"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { useT } from "@/i18n/client";

const THRESHOLD = 72;
const MAX = 110;

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

// Tarikan dimulai di dalam area yang sedang tergulir (laci navigasi, tabel, modal) bukan tarikan halaman
function insideScrolled(el: EventTarget | null) {
  for (let n = el as HTMLElement | null; n && n !== document.body; n = n.parentElement) {
    if (n.scrollTop > 0) return true;
  }
  return false;
}

// PWA standalone tidak punya tarik-untuk-memuat-ulang bawaan peramban (terutama iOS), jadi dibuat sendiri.
// Memuat ulang lewat router.refresh(): data server diambil lagi tanpa splash dan tanpa kehilangan isi form di klien.
export function PullToRefresh() {
  const router = useRouter();
  const t = useT();
  const [enabled, setEnabled] = useState(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, startTransition] = useTransition();
  const start = useRef<{ x: number; y: number } | null>(null);
  const pullRef = useRef(0);

  useEffect(() => { setEnabled(isStandalone() && "ontouchstart" in window); }, []);

  useEffect(() => {
    if (!enabled) return;
    const onStart = (e: TouchEvent) => {
      start.current = null;
      if (refreshing || e.touches.length !== 1 || window.scrollY > 0) return;
      if (document.querySelector('[aria-modal="true"]') || insideScrolled(e.target)) return;
      start.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
    };
    const onMove = (e: TouchEvent) => {
      if (!start.current) return;
      const dx = e.touches[0]!.clientX - start.current.x;
      const dy = e.touches[0]!.clientY - start.current.y;
      // Geser ke samping atau ke atas: batalkan
      if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) { start.current = null; pullRef.current = 0; setPull(0); return; }
      pullRef.current = Math.min(MAX, dy * 0.5);
      setPull(pullRef.current);
    };
    const onEnd = () => {
      if (!start.current) return;
      start.current = null;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        startTransition(() => router.refresh());
      }
      pullRef.current = 0;
      setPull(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled, refreshing, router]);

  // Indikator ditahan sebentar setelah data baru tiba supaya tidak berkedip
  useEffect(() => {
    if (!refreshing || pending) return;
    const id = setTimeout(() => setRefreshing(false), 300);
    return () => clearTimeout(id);
  }, [refreshing, pending]);

  if (!enabled || (pull === 0 && !refreshing)) return null;
  const offset = refreshing ? THRESHOLD * 0.75 : pull;
  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div role="status" aria-label={refreshing ? t("Memuat ulang halaman") : undefined}
      className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[110] flex justify-center"
      style={{ transform: `translateY(${offset - 44}px)`, transition: pull === 0 ? "transform 200ms var(--ease-out-soft)" : undefined }}>
      <span className="bg-surface flex size-10 items-center justify-center rounded-full border border-neutral-200 text-plum-600 shadow-[0_4px_14px_rgba(62,26,45,0.14)] [&_svg]:size-[18px]"
        style={{ opacity: refreshing ? 1 : 0.4 + progress * 0.6 }}>
        {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw style={{ transform: `rotate(${progress * 270}deg)` }} />}
      </span>
    </div>
  );
}
