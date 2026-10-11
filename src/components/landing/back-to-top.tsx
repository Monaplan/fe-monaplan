"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/components/ui/cn";

// Tombol kembali ke atas: hanya panah, muncul setelah halaman digulir cukup jauh.
// Di HP posisinya naik supaya tidak menutupi bar promo di dasar layar.
export function BackToTop() {
  const t = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setShow(window.scrollY > 700)); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <button
      type="button"
      aria-label={t("Kembali ke atas")}
      tabIndex={show ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className={cn(
        "fixed right-4 bottom-24 z-40 [html[data-promo-open]_&]:max-sm:bottom-60 inline-flex size-12 items-center justify-center rounded-2xl border border-neutral-200 bg-surface text-neutral-800 shadow-pop transition-[opacity,transform,background-color] duration-200 hover:bg-plum-50 hover:text-plum-700 active:scale-95 md:right-6 md:bottom-6",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ChevronUp className="size-5" aria-hidden="true" />
    </button>
  );
}
