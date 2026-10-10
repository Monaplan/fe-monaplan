"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

// Tombol di sampul: menggulir halus ke isi undangan
export function OpenButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => document.getElementById("isi")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className="rv-open group mt-9 inline-flex h-12 items-center gap-2 border border-[var(--rv-accent)] bg-[var(--rv-accent)] px-7 text-[13px] font-semibold tracking-[0.14em] text-[var(--rv-accent-ink)] uppercase shadow-sm transition-[transform,filter] [border-radius:var(--rv-radius)] hover:brightness-110 active:scale-[0.98]">
      {label}
      <ChevronDown className="size-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
    </button>
  );
}

// Hitung mundur ke awal acara pertama; angka diisi setelah tampil di peramban agar HTML server dan klien sama
export function Countdown({ target, title, labels }: { target: string; title: string; labels: [string, string, string, string] }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = Date.parse(target);
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const s = left === null ? null : Math.floor(left / 1000);
  const parts = s === null ? [0, 0, 0, 0] : [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  return (
    <div className="grid grid-cols-4 gap-2.5" role="timer" aria-label={title}>
      {parts.map((n, i) => (
        <div key={i} className="border border-[var(--rv-card-border)] bg-[var(--rv-card)] py-3.5 text-center [border-radius:var(--rv-radius)]">
          <div className="tabular font-[family-name:var(--rv-font)] text-[30px] leading-8 font-medium text-[var(--rv-accent)] [font-variant-numeric:lining-nums_tabular-nums]">{String(n).padStart(2, "0")}</div>
          <div className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-[var(--rv-muted)] uppercase">{labels[i]}</div>
        </div>
      ))}
    </div>
  );
}
