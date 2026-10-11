"use client";

import { useEffect } from "react";

// Menjeda animasi tanpa henti (marquee, kartu melayang, tombol berkilau) saat elemennya tidak terlihat di layar.
// Animasi yang tidak terlihat tetap memakan waktu pembuatan frame, terutama di HP berspesifikasi rendah.
const SELECTOR = ".marquee-track, .animate-float, .animate-float-slow, .btn-glow";

export function AnimationGate() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) e.target.removeAttribute("data-paused");
        else e.target.setAttribute("data-paused", "");
      }
    }, { rootMargin: "80px" });
    document.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
