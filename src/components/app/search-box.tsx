"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Clock, FileText, Gift, Heart, ListChecks, Loader2, Mail, Palette, Plane, Search, Store, Wallet, type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/i18n/client";

type Hit = { id: string; title: string; sub: string | null; href: string };
type Group = { key: string; hits: Hit[] };

const META: Record<string, { label: string; icon: LucideIcon }> = {
  tugas: { label: "Tugas", icon: ListChecks },
  vendor: { label: "Vendor", icon: Store },
  tamu: { label: "Tamu", icon: Mail },
  budget: { label: "Budget", icon: Wallet },
  pembayaran: { label: "Pembayaran", icon: Wallet },
  mahar: { label: "Mahar & Seserahan", icon: Gift },
  dokumen: { label: "Dokumen", icon: FileText },
  acara: { label: "Acara", icon: Heart },
  rundown: { label: "Rundown", icon: Clock },
  agenda: { label: "Agenda", icon: CalendarDays },
  inspirasi: { label: "Rona Impian", icon: Palette },
  perjalanan: { label: "Honeymoon Planner", icon: Plane },
};

// Kotak pencarian di header: hasil langsung dari semua modul, panah dan Enter untuk memilih, Ctrl K untuk memfokus.
// base = alamat halaman hasil lengkap, contoh /app/raka-nadia/cari
export function SearchBox({ base, className }: { base: string; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const [searched, setSearched] = useState("");
  const ref = base.split("/")[2] ?? "";
  const flat = groups.flatMap((g) => g.hits);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && input.current && input.current.offsetParent !== null) {
        e.preventDefault();
        input.current.focus();
        input.current.select();
      }
    };
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, []);

  // Debounce 200 ms; permintaan lama dibatalkan agar hasil tidak tertukar
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setGroups([]); setSearched(""); setBusy(false); return; }
    setBusy(true);
    const ctl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?p=${encodeURIComponent(ref)}&q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const j = await res.json();
        setGroups(j.groups ?? []);
        setSearched(term);
        setActive(-1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") { setGroups([]); setSearched(term); }
      } finally {
        if (!ctl.signal.aborted) setBusy(false);
      }
    }, 200);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [q, ref]);

  const go = (href: string) => { setOpen(false); input.current?.blur(); router.push(href); };
  const full = () => { const term = q.trim(); if (term) go(`${base}?q=${encodeURIComponent(term)}`); };

  return (
    <div ref={box} data-tour="search" className={cn("relative w-72", className)}>
      <form onSubmit={(e) => { e.preventDefault(); if (active >= 0 && flat[active]) go(flat[active]!.href); else full(); }} role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" />
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
            else if (e.key === "ArrowDown" && flat.length) { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % flat.length); }
            else if (e.key === "ArrowUp" && flat.length) { e.preventDefault(); setActive((a) => (a <= 0 ? flat.length - 1 : a - 1)); }
          }}
          role="combobox" aria-expanded={open && q.trim().length >= 2} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          placeholder={t("Cari tugas, vendor, tamu")} aria-label={t("Cari")} autoComplete="off" enterKeyHint="search"
          className="h-10 w-full rounded-full border border-neutral-200/80 bg-surface pr-16 pl-10 text-sm shadow-[0_1px_2px_rgba(62,26,45,0.04)] outline-none focus:border-plum-400 focus:ring-[3px] focus:ring-plum-100"
        />
        <span className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center">
          {busy ? <Loader2 className="size-4 animate-spin text-neutral-400" /> : <kbd className="rounded-md border border-neutral-200 bg-neutral-50 px-1.5 text-[10.5px] text-neutral-500">{t("Ctrl K")}</kbd>}
        </span>
      </form>

      {open && q.trim().length >= 2 && (
        <div id={listId} role="listbox" className="animate-pop-in absolute top-12 left-0 z-50 max-h-[70dvh] w-[26rem] max-w-[calc(100vw-2rem)] origin-top overflow-y-auto rounded-2xl border border-neutral-200 bg-surface p-1.5 shadow-pop md:right-0 md:left-auto">
          {searched === q.trim() && groups.length === 0 && !busy && (
            <p className="px-3 py-6 text-center text-[13px] text-neutral-500">{t("Tidak ada hasil untuk \"{q}\".", { q: q.trim() })}</p>
          )}
          {(() => {
            let i = -1;
            return groups.map((g) => {
              const m = META[g.key]!;
              const Icon = m.icon;
              return (
                <div key={g.key} role="group" aria-label={t(m.label)}>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">{t(m.label)}</p>
                  {g.hits.map((h) => {
                    i += 1;
                    const idx = i;
                    return (
                      <button key={h.id} id={`${listId}-${idx}`} role="option" aria-selected={active === idx} type="button" onMouseEnter={() => setActive(idx)} onClick={() => go(h.href)}
                        className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors", active === idx ? "bg-plum-50" : "hover:bg-neutral-50")}>
                        <Icon className="size-4 shrink-0 text-plum-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-neutral-800">{h.title}</span>
                          {h.sub && <span className="block truncate text-xs text-neutral-500">{h.sub}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}
          {groups.length > 0 && (
            <button type="button" onClick={full} className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg border-t border-neutral-200 text-[13px] font-medium text-plum-700 hover:bg-plum-50">
              {t("Lihat semua hasil")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
