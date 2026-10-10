"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Tujuan tautan hasil pencarian (?hl=<id>): gulir ke baris itu dan sorot sebentar. Baris menandai diri dengan data-row-id.
export function RowHighlight() {
  const params = useSearchParams();
  const pathname = usePathname();
  const id = params.get("hl");

  useEffect(() => {
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) return;
    let tries = 0;
    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    // Isi halaman bisa tiba setelah render pertama (streaming), jadi dicoba beberapa kali
    const timer = setInterval(() => {
      const el = document.querySelector<HTMLElement>(`[data-row-id="${id}"]`);
      if (el) {
        clearInterval(timer);
        el.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        el.classList.add("row-flash");
        flashTimer = setTimeout(() => el.classList.remove("row-flash"), 2600);
      } else if (++tries > 20) clearInterval(timer);
    }, 150);
    return () => { clearInterval(timer); if (flashTimer) clearTimeout(flashTimer); };
  }, [id, pathname]);

  return null;
}
