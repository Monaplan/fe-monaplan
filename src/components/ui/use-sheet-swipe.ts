"use client";

import { useEffect, useRef, type RefObject } from "react";

// Geser ke bawah untuk menutup lembar di HP (menu, modal). Menarik dari pegangan, kepala, atau isi yang sedang di posisi paling atas;
// isi yang masih bisa digulir tetap menggulir seperti biasa. Hanya aktif di layar sempit dan di perangkat sentuh.
export function useSheetSwipe(ref: RefObject<HTMLElement | null>, onClose: () => void, active = true) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    let startY = 0, startT = 0, dy = 0;
    let tracking = false, dragging = false;
    let scroller: HTMLElement | null = null;
    const narrow = () => window.matchMedia("(max-width: 767px)").matches;
    const settle = () => { el.style.transition = "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)"; el.style.transform = ""; };

    const onStart = (e: TouchEvent) => {
      if (!narrow() || e.touches.length !== 1) return;
      tracking = true; dragging = false; dy = 0;
      startY = e.touches[0]!.clientY; startT = e.timeStamp;
      scroller = (e.target as HTMLElement).closest<HTMLElement>(".modal-body, .overflow-y-auto");
      el.style.transition = "none";
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      dy = e.touches[0]!.clientY - startY;
      if (!dragging) {
        if (scroller && scroller.scrollTop > 0) { tracking = false; return; }
        if (dy < -6) { tracking = false; return; }
        if (dy <= 6) return;
        dragging = true;
      }
      e.preventDefault();
      el.style.transform = `translateY(${Math.max(0, dy)}px)`;
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) { el.style.transition = ""; return; }
      dragging = false;
      const velocity = dy / Math.max(1, e.timeStamp - startT);
      if (dy > 110 || velocity > 0.6) {
        el.style.transition = "transform 180ms ease-in";
        el.style.transform = "translateY(100%)";
        window.setTimeout(() => closeRef.current(), 170);
      } else settle();
    };
    const onCancel = () => { if (dragging) settle(); tracking = false; dragging = false; };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [ref, active]);
}
