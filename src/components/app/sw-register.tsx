"use client";

import { useEffect } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global { interface Window { __mpInstall?: InstallEvent | null } }

// Daftarkan service worker setelah halaman selesai dimuat dan peramban senggang, supaya tidak menambah waktu muat.
// Event pemasangan (Android) disimpan untuk tombol "Pasang" di kartu pemasangan.
export function SwRegister() {
  useEffect(() => {
    const keep = (e: Event) => { e.preventDefault(); window.__mpInstall = e as InstallEvent; window.dispatchEvent(new Event("mp-installable")); };
    window.addEventListener("beforeinstallprompt", keep);
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return () => window.removeEventListener("beforeinstallprompt", keep);
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    const idle = (cb: () => void) => ("requestIdleCallback" in window ? window.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 2000));
    if (document.readyState === "complete") idle(register);
    else window.addEventListener("load", () => idle(register), { once: true });
    return () => window.removeEventListener("beforeinstallprompt", keep);
  }, []);
  return null;
}
