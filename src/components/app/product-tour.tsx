"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/components/ui/cn";

export type TourStep = { target: string; title: string; body: string };

const KEY = (id: string) => `mp-tour:v1:${id}`;
const PAD = 8;

function findTarget(target: string): HTMLElement | null {
  // Ambil elemen pertama yang benar-benar terlihat (versi desktop dan HP bisa sama-sama ada di DOM)
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
  return els.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  }) ?? null;
}

// Tur panduan: menyorot elemen ber-atribut data-tour, menggelapkan sisanya, dan menampilkan kartu penjelasan.
// Otomatis tampil sekali per halaman; bisa diputar ulang lewat tombol bantuan di top bar (event "mp:tour-start").
export function ProductTour({ id, steps, autoStart = true }: { id: string; steps: TourStep[]; autoStart?: boolean }) {
  const [active, setActive] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const start = useCallback(() => {
    const visible = steps.filter((s) => findTarget(s.target));
    if (!visible.length) return;
    setActive(visible);
    setIndex(0);
  }, [steps]);

  const finish = useCallback(() => {
    setActive(null);
    setRect(null);
    try { localStorage.setItem(KEY(id), new Date().toISOString()); } catch {}
  }, [id]);

  // Daftarkan tur halaman ini agar tombol bantuan tahu ada tur yang bisa diputar
  useEffect(() => {
    document.body.dataset.tour = id;
    const onStart = () => start();
    window.addEventListener("mp:tour-start", onStart);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (autoStart) {
      let seen = false;
      try { seen = !!localStorage.getItem(KEY(id)); } catch {}
      if (!seen) timer = setTimeout(start, 700);
    }
    return () => {
      window.removeEventListener("mp:tour-start", onStart);
      if (document.body.dataset.tour === id) delete document.body.dataset.tour;
      if (timer) clearTimeout(timer);
    };
  }, [id, autoStart, start]);

  const step = active?.[index];

  // Gulir ke elemen dan ikuti posisinya saat layar digulir atau diubah ukurannya
  useLayoutEffect(() => {
    if (!step) return;
    const el = findTarget(step.target);
    if (!el) { setIndex((i) => (active && i < active.length - 1 ? i + 1 : i)); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      setRect((prev) => (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height ? prev : r));
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [step, active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, active.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active || !step || !rect || typeof document === "undefined") return null;
  const last = index === active.length - 1;

  // Posisi kartu: di bawah elemen bila cukup ruang, selain itu di atas; selalu di dalam layar
  const vw = window.innerWidth, vh = window.innerHeight;
  const mobile = vw < 640;
  const cardW = Math.min(360, vw - 32);
  const CARD_H = 240;
  const GAP = PAD + 12;
  let top: number | undefined, bottom: number | undefined;
  let left = Math.max(16, Math.min(rect.left + rect.width / 2 - cardW / 2, vw - cardW - 16));
  if (vh - rect.bottom - GAP >= CARD_H) top = rect.bottom + GAP;                 // di bawah elemen
  else if (rect.top - GAP >= CARD_H) bottom = vh - rect.top + GAP;               // di atas elemen
  else if (vw - rect.right - GAP >= cardW + 16) {                                // di kanan elemen tinggi (misal sidebar)
    left = rect.right + GAP;
    top = Math.max(16, Math.min(rect.top, vh - CARD_H - 16));
  } else if (rect.left - GAP >= cardW + 16) {                                    // di kiri elemen
    left = rect.left - GAP - cardW;
    top = Math.max(16, Math.min(rect.top, vh - CARD_H - 16));
  } else bottom = 16;                                                            // menempel di bawah layar

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {/* Lapisan penangkap klik agar halaman di belakang tidak tersentuh */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {/* Sorotan: kotak transparan dengan bayangan besar yang menggelapkan sisa layar */}
      <div
        className="pointer-events-none absolute rounded-2xl ring-2 ring-plum-300 transition-all duration-300 ease-out"
        style={{
          top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2,
          boxShadow: "0 0 0 9999px rgba(28, 22, 25, 0.55)",
        }}
      />
      <div
        key={index}
        className={cn("animate-sheet-in absolute rounded-2xl border border-neutral-200 bg-surface p-5 shadow-modal", mobile && "inset-x-3 bottom-3")}
        style={mobile ? undefined : { width: cardW, left, top, bottom }}
      >
        <div className="flex items-start gap-3">
          <h2 id="tour-title" className="flex-1 text-[17px] leading-6 font-semibold text-neutral-900">{step.title}</h2>
          <span className="tabular shrink-0 pt-0.5 text-xs text-neutral-500">{index + 1} / {active.length}</span>
        </div>
        <p id="tour-body" className="mt-2 text-[13.5px] leading-[22px] text-neutral-600">{step.body}</p>
        <div className="mt-5 flex items-center gap-2">
          {!last && <button onClick={finish} className="text-[13px] font-medium text-neutral-500 hover:text-neutral-800">Lewati</button>}
          <div className="ml-auto flex items-center gap-2">
            {index > 0 && (
              <button onClick={() => setIndex(index - 1)} aria-label="Sebelumnya"
                className="inline-flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200">
                <ArrowLeft className="size-4" />
              </button>
            )}
            <button
              autoFocus
              onClick={() => (last ? finish() : setIndex(index + 1))}
              className="inline-flex h-9 items-center rounded-full bg-plum-600 px-4 text-[13px] font-semibold text-white shadow-btn hover:bg-plum-700 dark:hover:bg-plum-600 dark:hover:brightness-110"
            >
              {last ? "Oke, mengerti" : "Lanjut"}
            </button>
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
          {active.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-plum-600" : "w-1.5 bg-plum-200")} />)}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Putar ulang tur halaman aktif (dipakai tombol bantuan)
export function startPageTour(): boolean {
  if (!document.body.dataset.tour) return false;
  window.dispatchEvent(new Event("mp:tour-start"));
  return true;
}
