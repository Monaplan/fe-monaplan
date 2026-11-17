"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

// Popover yang menempel pada sebuah elemen dan dirender di body (posisi tetap), supaya tidak terpotong modal atau kartu
// dengan overflow. Membuka ke bawah, atau ke atas bila ruang di bawah kurang. Bila keduanya kurang (layar pendek atau
// zoom besar), popover dijepit di dalam layar dan bisa digulir. Ukuran diambil dari isi sebenarnya dan diukur ulang
// saat isinya berubah. Escape dan klik di luar menutupnya.
const GAP = 8;
export function AnchoredPopover({ anchor, onClose, width = 308, children }: { anchor: RefObject<HTMLElement | null>; onClose: () => void; width?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number; scroll: boolean } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      if (!a) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const maxHeight = vh - GAP * 2;
      const full = ref.current?.scrollHeight ?? 380;
      const h = Math.min(full, maxHeight);
      const scroll = full > maxHeight;
      const w = Math.min(ref.current?.offsetWidth || width, vw - GAP * 2);
      const below = vh - a.bottom - 6, above = a.top - 6;
      let top = below >= h + GAP ? a.bottom + 6 : above >= h + GAP ? a.top - h - 6 : below >= above ? a.bottom + 6 : a.top - h - 6;
      top = Math.max(GAP, Math.min(top, vh - h - GAP));
      const left = Math.max(GAP, Math.min(a.left, vw - w - GAP));
      setPos((p) => (p && p.top === top && p.left === left && p.maxHeight === maxHeight && p.scroll === scroll ? p : { top, left, maxHeight, scroll }));
    };
    place();
    const ro = new ResizeObserver(place);
    if (ref.current?.firstElementChild) ro.observe(ref.current.firstElementChild);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { ro.disconnect(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [anchor, width]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      const n = e.target as Node;
      if (ref.current?.contains(n) || anchor.current?.contains(n)) return;
      closeRef.current();
    };
    // Escape ditangkap lebih dulu (fase capture) supaya hanya popover yang menutup, bukan modal di bawahnya
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); anchor.current?.focus(); } };
    document.addEventListener("mousedown", down);
    window.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("mousedown", down); window.removeEventListener("keydown", key, true); };
  }, [anchor]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div ref={ref} style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, ...(pos?.scroll && { maxHeight: pos.maxHeight, overflowY: "auto", overscrollBehavior: "contain" }), zIndex: 200, visibility: pos ? "visible" : "hidden" }}>
      {children}
    </div>,
    document.body,
  );
}
