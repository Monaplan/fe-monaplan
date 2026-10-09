"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "./cn";

// Tumpukan modal yang terbuka: Escape dan Tab hanya berlaku untuk modal paling atas
const stack: string[] = [];
let lockCount = 0;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Slot footer modal: FormActions dirender ke sini agar tombol selalu terlihat dan tidak menimpa isi form
const FooterCtx = createContext<HTMLElement | null>(null);
export const useModalFooter = () => useContext(FooterCtx);

// Dialog di desktop, bottom sheet di HP (DESIGN.md 6.4 dan 8.7)
export function Modal({ open, onClose, title, description, children, size = "md", hideHeader }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: "md" | "lg";
  hideHeader?: boolean;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    stack.push(id);
    if (lockCount++ === 0) document.body.style.overflow = "hidden";

    // Fokus awal: elemen ber-autoFocus, atau isian pertama, atau panel
    requestAnimationFrame(() => {
      const el = panel.current;
      if (!el || el.contains(document.activeElement)) return;
      (el.querySelector<HTMLElement>("[autofocus]")
        ?? el.querySelector<HTMLElement>(".modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea")
        ?? el.querySelector<HTMLElement>(FOCUSABLE)
        ?? el).focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === "Tab" && panel.current) {
        const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null);
        if (!items.length) return;
        const first = items[0]!, last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.lastIndexOf(id);
      if (i >= 0) stack.splice(i, 1);
      if (--lockCount === 0) document.body.style.overflow = "";
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open, id]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-8" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <div className="animate-fade-in absolute inset-0 bg-[rgba(28,22,25,0.45)] backdrop-blur-[2px] dark:bg-[rgba(0,0,0,0.6)]" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className={cn(
          "animate-sheet-in relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-neutral-200/70 bg-surface shadow-modal outline-none md:max-h-[min(90dvh,880px)] md:rounded-3xl",
          hideHeader ? "md:max-w-[460px]" : size === "lg" ? "md:max-w-[720px]" : "md:max-w-[540px]",
        )}
      >
        <span className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-neutral-200 md:hidden" aria-hidden="true" />
        {hideHeader ? (
          <span id={`${id}-title`} className="sr-only">{title}</span>
        ) : (
          <div className="flex shrink-0 items-start gap-4 border-b border-neutral-200/70 px-6 pt-5 pb-4 md:px-7 md:pt-6">
            <div className="min-w-0 flex-1">
              <h2 id={`${id}-title`} className="text-lg leading-7 font-semibold text-neutral-900">{title}</h2>
              {description && <p className="mt-1 text-[13.5px] leading-5 text-neutral-500">{description}</p>}
            </div>
            <button aria-label="Tutup" onClick={onClose} className="-mt-0.5 -mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800">
              <X className="size-[18px]" />
            </button>
          </div>
        )}
        <FooterCtx.Provider value={footer}>
          <div className={cn("modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain", hideHeader ? "p-6 md:p-7" : "px-6 py-6 md:px-7")}>
            {children}
          </div>
        </FooterCtx.Provider>
        <div
          ref={setFooter}
          className="flex shrink-0 flex-col-reverse gap-2.5 border-t border-neutral-200/70 bg-neutral-50/60 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] empty:hidden sm:flex-row sm:items-center sm:justify-end sm:gap-3 md:px-7 md:pb-4 [&>button]:w-full sm:[&>button]:w-auto [&>a]:w-full sm:[&>a]:w-auto"
        />
      </div>
    </div>,
    document.body,
  );
}

// Tombol aksi modal: dirender ke footer modal bila ada, selain itu tampil sebagai baris aksi biasa
export function ModalFooter({ children }: { children: ReactNode }) {
  const footer = useModalFooter();
  if (footer) return createPortal(children, footer);
  return <div className="mt-1 flex flex-col-reverse gap-2.5 border-t border-neutral-200/80 pt-5 sm:flex-row sm:justify-end sm:gap-3">{children}</div>;
}
