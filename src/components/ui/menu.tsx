"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { cn } from "./cn";
import { useToast } from "./toast";
import { useConfirm } from "./dialogs";
import type { ActionResult } from "@/lib/result";

export type MenuItem = {
  label: string;
  icon?: ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  action?: () => Promise<ActionResult>;
  confirm?: string;
  danger?: boolean;
  hidden?: boolean;
};

// Menu titik tiga untuk aksi baris
export function RowMenu({ items, label = "Aksi" }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();
  const visible = items.filter((i) => !i.hidden);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!visible.length) return null;

  const toggle = () => {
    // Buka ke atas bila ruang di bawah tidak cukup (baris terakhir tabel, dekat bottom nav HP)
    const r = trigger.current?.getBoundingClientRect();
    const needed = visible.length * 38 + 16;
    setUp(!!r && window.innerHeight - r.bottom < needed + 90 && r.top > needed);
    setOpen((o) => !o);
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={toggle}
        className="inline-flex size-10 items-center justify-center rounded-full bg-neutral-100 md:size-8 text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" className={cn("animate-fade-in absolute right-0 z-50 min-w-44 rounded-xl border border-neutral-200 bg-surface p-1 shadow-pop", up ? "bottom-full mb-1" : "mt-1")}>
            {visible.map((item) => {
              const cls = cn("flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm whitespace-nowrap hover:bg-neutral-100 [&_svg]:size-4", item.danger ? "text-danger" : "text-neutral-800");
              if (item.href) {
                return item.external ? (
                  <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className={cls} onClick={() => { setOpen(false); item.onClick?.(); }}>{item.icon}{item.label}</a>
                ) : (
                  <Link key={item.label} href={item.href} className={cls} onClick={() => setOpen(false)}>{item.icon}{item.label}</Link>
                );
              }
              return (
                <button
                  key={item.label}
                  type="button"
                  className={cls}
                  onClick={async () => {
                    setOpen(false);
                    if (item.confirm && !(await confirm({
                      title: item.confirm,
                      tone: item.danger ? "danger" : "default",
                      confirmLabel: item.danger ? item.label.replace(/…$/, "") : "Lanjutkan",
                    }))) return;
                    if (item.onClick) item.onClick();
                    if (item.action) {
                      const act = item.action;
                      start(async () => {
                        const res = await act();
                        if (res.ok) { if (res.message) toast(res.message); } else toast(res.error, "danger");
                      });
                    }
                  }}
                >
                  {item.icon}{item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
