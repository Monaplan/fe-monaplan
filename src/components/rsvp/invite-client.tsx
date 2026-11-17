"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, MailOpen } from "lucide-react";

// Pembungkus undangan: sampul pembuka menutupi halaman sampai tamu menekan "Buka Undangan", lalu sampul terangkat
// dan isi pertama dianimasikan masuk. Bagian lain muncul saat digulir (IntersectionObserver, jalan di semua peramban).
// Tanpa JavaScript sampul disembunyikan lewat <noscript> dan semua isi langsung tampil.
export function InviteShell({ style, themeId, className, gate, children }: {
  style: CSSProperties;
  themeId: string;
  className: string;
  gate: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [opened, setOpened] = useState(false);
  const [gone, setGone] = useState(false);

  // Gulir dikunci selama sampul masih menutup
  useEffect(() => {
    if (opened) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => { el.style.overflow = prev; };
  }, [opened]);

  // Penanda data-js hanya dipasang di peramban, jadi status tersembunyi awal tidak pernah berlaku tanpa JavaScript
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.dataset.js = "";
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).dataset.in = "";
        io.unobserve(e.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    root.querySelectorAll("[data-reveal]:not([data-in])").forEach((n) => io.observe(n));
    return () => io.disconnect();
    // Ganti tema (halaman contoh) bisa memunculkan elemen baru, jadi diamati ulang
  }, [themeId]);

  function open() {
    window.scrollTo({ top: 0 });
    setOpened(true);
    setTimeout(() => setGone(true), 1500);
  }

  return (
    <main ref={ref} style={style} data-rsvp-theme={themeId} data-open={opened ? "" : undefined} className={className}>
      <noscript><style>{".rv-gate{display:none!important}"}</style></noscript>
      {!gone && (
        <div className="rv-gate" data-leaving={opened ? "" : undefined} aria-hidden={opened || undefined}>
          <div className="rv-gate-inner relative flex min-h-full flex-col items-center justify-center px-9 py-16 text-center">
            {gate}
            <button type="button" onClick={open} style={{ "--d": "1500ms" } as CSSProperties}
              className="rv-i rv-glow-btn group mt-9 inline-flex h-12 items-center gap-2.5 border border-[var(--rv-accent)] bg-[var(--rv-accent)] px-7 text-[13px] font-semibold tracking-[0.16em] text-[var(--rv-accent-ink)] uppercase transition-[transform,filter] [border-radius:var(--rv-radius)] hover:brightness-110 active:scale-[0.97]">
              <MailOpen className="size-4" aria-hidden="true" />Buka Undangan
            </button>
          </div>
        </div>
      )}
      {children}
    </main>
  );
}

// Penunjuk gulir di bawah sampul isi
export function ScrollHint({ label }: { label: string }) {
  return (
    <button type="button" aria-label={label} onClick={() => document.getElementById("isi")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className="rv-bob inline-flex size-11 items-center justify-center rounded-full border border-[var(--rv-card-border)] text-[var(--rv-accent)]">
      <ChevronDown className="size-5" aria-hidden="true" />
    </button>
  );
}

// Hitung mundur ke awal acara pertama; angka diisi setelah tampil di peramban agar HTML server dan klien sama.
// Setiap angka yang berganti dipasang ulang (key) sehingga animasi gantinya berjalan.
export function Countdown({ target, title, labels, doneText }: { target: string; title: string; labels: [string, string, string, string]; doneText: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = Date.parse(target);
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (left === 0) return <p className="font-[family-name:var(--rv-font)] text-[24px] leading-8 font-medium text-[var(--rv-accent)] italic">{doneText}</p>;
  const s = left === null ? null : Math.floor(left / 1000);
  const parts = s === null ? [0, 0, 0, 0] : [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  return (
    <div className="grid grid-cols-4 gap-2.5" role="timer" aria-label={title}>
      {parts.map((n, i) => (
        <div key={i} className="rv-count relative overflow-hidden border border-[var(--rv-card-border)] bg-[var(--rv-card)] py-4 text-center [border-radius:var(--rv-radius)]">
          <div className="h-9 overflow-hidden">
            <div key={n} className="rv-tick font-[family-name:var(--rv-font)] text-[32px] leading-9 font-medium text-[var(--rv-accent)] [font-variant-numeric:lining-nums_tabular-nums]">{String(n).padStart(2, "0")}</div>
          </div>
          <div className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-[var(--rv-muted)] uppercase">{labels[i]}</div>
        </div>
      ))}
    </div>
  );
}
