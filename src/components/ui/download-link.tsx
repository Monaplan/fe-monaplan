"use client";

import { useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button";
import { useToast } from "./toast";
import { useT } from "@/i18n/client";

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

function fileNameFrom(res: Response, fallback: string) {
  const m = res.headers.get("Content-Disposition")?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return m ? decodeURIComponent(m[1]!) : fallback;
}

// Di PWA standalone (terutama iOS) tautan file dibuka sebagai layar penuh tanpa tombol kembali.
// Karena itu file diambil lewat fetch lalu diserahkan ke share sheet ("Simpan ke File") atau diunduh sebagai blob.
// Di peramban biasa tautan dibiarkan bekerja seperti biasa.
export function DownloadLink({ href, variant = "outline", size, icon, className, children, unstyled, ...rest }:
  { href: string; variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode; unstyled?: boolean } & Omit<ComponentProps<"a">, "href">) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const t = useT();

  async function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!isStandalone()) return;
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(href, { credentials: "same-origin" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], fileNameFrom(res, "monaplan-export"), { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file] }); } catch (err) { if ((err as Error).name !== "AbortError") throw err; }
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      toast(t("Gagal mengunduh file. Coba lagi."), "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <a href={href} download onClick={onClick} aria-busy={busy} className={unstyled ? className : buttonClass(variant, size, className)} {...rest}>
      {busy ? <Loader2 className="animate-spin" /> : icon}
      {children}
    </a>
  );
}
