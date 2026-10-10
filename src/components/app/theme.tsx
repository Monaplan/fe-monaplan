"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/components/ui/cn";

export type ThemePref = "light" | "dark" | "system";
import { THEME_KEY as KEY } from "@/lib/theme-script";
import { useT } from "@/i18n/client";


function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#1C1519" : "#8C3A63");
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
}

// Simpan pilihan tema dan terapkan (tanpa hook, bisa dipanggil dari mana saja)
export function setThemePref(p: ThemePref) {
  try { localStorage.setItem(KEY, p); } catch {}
  apply(p);
  window.dispatchEvent(new CustomEvent("mp:theme", { detail: p }));
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>("light");
  useEffect(() => {
    let saved: ThemePref = "light";
    try { saved = (localStorage.getItem(KEY) as ThemePref) || "light"; } catch {}
    setPref(saved);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if ((localStorage.getItem(KEY) ?? "light") === "system") apply("system"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const set = (p: ThemePref) => {
    setPref(p);
    setThemePref(p);
  };
  useEffect(() => {
    const on = (e: Event) => setPref((e as CustomEvent<ThemePref>).detail);
    window.addEventListener("mp:theme", on);
    return () => window.removeEventListener("mp:theme", on);
  }, []);
  return [pref, set] as const;
}

const OPTIONS: { key: ThemePref; label: string; icon: React.ReactNode }[] = [
  { key: "light", label: "Terang", icon: <Sun /> },
  { key: "dark", label: "Gelap", icon: <Moon /> },
  { key: "system", label: "Sistem", icon: <Monitor /> },
];

// Pilihan tema tiga opsi (dipakai di menu akun dan halaman Akun)
export function ThemeSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const t = useT();
  const [pref, set] = useTheme();
  return (
    <div role="radiogroup" aria-label={t("Tema tampilan")} className={cn("flex rounded-full bg-neutral-100 p-1", className)}>
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={pref === o.key}
          title={t(o.label)}
          onClick={() => set(o.key)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-medium transition-colors [&_svg]:size-3.5",
            compact ? "h-9 md:h-7" : "h-10 px-3 md:h-8",
            pref === o.key ? "bg-surface text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-neutral-200" : "text-neutral-500 hover:text-neutral-800",
          )}
        >
          {o.icon}{!compact && t(o.label)}
        </button>
      ))}
    </div>
  );
}

// Tombol ikon cepat terang/gelap untuk top bar dan halaman publik.
// Ikon dipilih lewat CSS (kelas .dark), bukan state, agar HTML server dan client selalu sama saat hidrasi.
export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => setThemePref(document.documentElement.classList.contains("dark") ? "light" : "dark")}
      aria-label={t("Ganti tema terang atau gelap")}
      title={t("Ganti tema")}
      className={cn("inline-flex size-10 items-center justify-center rounded-full text-neutral-600 hover:bg-surface hover:text-neutral-900", className)}
    >
      <Moon className="size-5 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-5 dark:block" aria-hidden="true" />
    </button>
  );
}

// Menerapkan ulang tema setelah hidrasi. Pengaman bila React merender ulang <html> dan kelas .dark hilang.
export function ThemeSync() {
  useEffect(() => {
    let pref: ThemePref = "light";
    try { pref = (localStorage.getItem(KEY) as ThemePref) || "light"; } catch {}
    const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (document.documentElement.classList.contains("dark") !== dark) apply(pref);
  }, []);
  return null;
}
