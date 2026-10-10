"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

// Popover yang menempel pada sebuah elemen dan dirender di body (posisi tetap), supaya tidak terpotong modal atau kartu
// dengan overflow. Membuka ke bawah, atau ke atas bila ruang di bawah kurang. Escape dan klik di luar menutupnya.
export function AnchoredPopover({ anchor, onClose, width = 308, children }: { anchor: RefObject<HTMLElement | null>; onClose: () => void; width?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      if (!a) return;
      const h = ref.current?.offsetHeight ?? 380;
      const below = window.innerHeight - a.bottom;
      const top = below >= h + 12 || a.top < h + 12 ? a.bottom + 6 : a.top - h - 6;
      const left = Math.max(8, Math.min(a.left, window.innerWidth - Math.min(width, window.innerWidth - 16) - 8));
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
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
    <div ref={ref} style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 200, visibility: pos ? "visible" : "hidden" }}>
      {children}
    </div>,
    document.body,
  );
}
