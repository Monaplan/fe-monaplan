"use client";

import { useEffect, useState } from "react";
import { formatIDR } from "@/lib/format";

// Angka yang naik halus dari 0 saat pertama tampil. Teks akhir sudah benar di HTML server (tanpa JS),
// dan animasi dilewati bila pengguna meminta gerak dikurangi.
export function CountUp({ value, kind = "int", duration = 700 }: { value: number; kind?: "int" | "idr"; duration?: number }) {
  const [shown, setShown] = useState<number | null>(null);
  const format = (n: number) => (kind === "idr" ? formatIDR(Math.round(n)) : Math.round(n).toLocaleString("id-ID"));

  useEffect(() => {
    if (!Number.isFinite(value) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setShown(null);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className="tabular">{format(shown ?? value)}</span>;
}
