"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "./cn";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
let loading: Promise<void> | null = null;

function loadScript() {
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error("turnstile")); };
    document.head.appendChild(s);
  });
  return loading;
}

// Tema widget mengikuti tampilan halaman (mode gelap situs atau tema undangan), bukan pengaturan perangkat:
// diambil dari warna latar terdekat di sekitar widget.
function surfaceTheme(el: HTMLElement): "light" | "dark" {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const m = getComputedStyle(n).backgroundColor.match(/rgba?\(([^)]+)\)/);
    if (!m) continue;
    const [r, g, b, a = "1"] = m[1]!.split(/[ ,/]+/).filter(Boolean);
    if (Number(a) < 0.5) continue;
    return (0.2126 * Number(r) + 0.7152 * Number(g) + 0.0722 * Number(b)) / 255 < 0.5 ? "dark" : "light";
  }
  return "light";
}

// Captcha Cloudflare Turnstile. Tanpa NEXT_PUBLIC_TURNSTILE_SITE_KEY komponen ini tidak menampilkan apa pun.
// Di dalam <form>, tokennya ikut terkirim sebagai kolom "cf-turnstile-response" dan diperbarui otomatis setelah form dikirim
// (token hanya berlaku sekali). Di luar form, ambil token lewat onToken dan ganti prop key untuk memuat ulang widget.
export function Turnstile({ onToken, className }: { onToken?: (token: string | null) => void; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Pantau pergantian mode gelap pada situs, lalu muat ulang widget dengan tema yang sesuai
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const sync = () => setTheme(surfaceTheme(el));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!SITE_KEY || !el) return;
    let id: string | undefined;
    let dead = false;
    loadScript().then(() => {
      if (dead || !window.turnstile) return;
      id = window.turnstile.render(el, {
        sitekey: SITE_KEY,
        size: "flexible",
        theme,
        "response-field-name": "cf-turnstile-response",
        callback: (t: string) => cb.current?.(t),
        "expired-callback": () => cb.current?.(null),
        "error-callback": () => cb.current?.(null),
      });
    }).catch(() => {});
    const form = el.closest("form");
    const renew = () => setTimeout(() => { if (id) window.turnstile?.reset(id); }, 0);
    form?.addEventListener("submit", renew);
    return () => {
      dead = true;
      form?.removeEventListener("submit", renew);
      if (id) window.turnstile?.remove(id);
    };
  }, [theme]);

  if (!SITE_KEY) return null;
  return <div ref={box} className={cn("min-h-[65px] w-full max-w-full overflow-hidden", className)} />;
}

export const turnstileEnabled = !!SITE_KEY;
