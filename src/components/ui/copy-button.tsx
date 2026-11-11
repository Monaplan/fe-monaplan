"use client";

import { Copy } from "lucide-react";
import { Button, type ButtonVariant } from "./button";
import { useToast } from "./toast";
import { useT } from "@/i18n/client";

// Salin teks ke papan klip dengan umpan balik toast. Bila peramban menolak (mis. konteks tidak aman), teksnya ditampilkan di toast.
export function CopyButton({ value, label, children, variant = "ghost", size = "icon-sm", message }: { value: string; label: string; children?: React.ReactNode; variant?: ButtonVariant; size?: "sm" | "md" | "icon" | "icon-sm"; message?: string }) {
  const t = useT();
  const toast = useToast();
  return (
    <Button variant={variant} size={size} title={label} aria-label={label} icon={<Copy />}
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); toast(message ?? t("Tersalin.")); } catch { toast(value); }
      }}>{children}</Button>
  );
}
