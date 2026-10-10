"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, LifeBuoy, MessageCircle, Play } from "lucide-react";
import { startPageTour } from "./product-tour";
import { supportWhatsappUrl } from "@/lib/support";
import { useT } from "@/i18n/client";

// Tombol bantuan di header: tur halaman, pusat bantuan, dan WhatsApp admin
export function HelpMenu({ helpHref, context }: { helpHref: string; context: string }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hasTour, setHasTour] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setHasTour(!!document.body.dataset.tour);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  const wa = supportWhatsappUrl(`Halo admin Monaplan, saya butuh bantuan.\nAkun: ${context}\nHalaman: ${pathname}`);
  const item = "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] text-neutral-700 hover:bg-neutral-100";

  return (
    <div ref={box} className="relative">
      <button data-tour="help" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={t("Bantuan")} title={t("Bantuan")}
        className="inline-flex size-10 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-surface"><CircleHelp className="size-5" /></button>
      {open && (
        <div role="menu" className="animate-pop-in absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl border border-neutral-200 bg-surface p-1.5 shadow-pop">
          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">{t("Butuh bantuan?")}</p>
          {hasTour && (
            <button role="menuitem" className={item} onClick={() => { setOpen(false); startPageTour(); }}>
              <Play className="size-4 text-plum-600" />{t("Tur halaman ini")}
            </button>
          )}
          <Link role="menuitem" href={helpHref} className={item} onClick={() => setOpen(false)}>
            <LifeBuoy className="size-4 text-plum-600" />{t("Pusat Bantuan")}
          </Link>
          {wa && (
            <a role="menuitem" href={wa} target="_blank" rel="noopener noreferrer" className={item} onClick={() => setOpen(false)}>
              <MessageCircle className="size-4 text-[#1FA855]" />
              <span className="flex-1">{t("Chat WhatsApp admin")}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
