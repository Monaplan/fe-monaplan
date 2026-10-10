"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "./cn";
import { inputClass } from "./form";
import { useT } from "@/i18n/client";

function fmt(n: string) {
  const d = n.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return d ? Number(d).toLocaleString("id-ID") : "";
}

// Input Rupiah: prefix Rp, format ribuan otomatis, keyboard numerik
export function CurrencyInput({ name, defaultValue, className, onValueChange, ...rest }: Omit<ComponentProps<"input">, "defaultValue"> & { defaultValue?: number | null; onValueChange?: (n: number) => void }) {
  const t = useT();
  const [value, setValue] = useState(defaultValue ? fmt(String(defaultValue)) : "");
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-500">{t("Rp")}</span>
      <input
        {...rest}
        inputMode="numeric"
        className={cn(inputClass, "tabular pl-9", className)}
        value={value}
        onChange={(e) => { const v = fmt(e.target.value); setValue(v); onValueChange?.(Number(v.replace(/\D/g, "")) || 0); }}
      />
      <input type="hidden" name={name} value={value.replace(/\D/g, "")} />
    </div>
  );
}

// Input WhatsApp: prefix +62, menerima 08xx
export function PhoneInput({ className, ...rest }: ComponentProps<"input">) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-500">+62</span>
      <input type="tel" inputMode="tel" placeholder="812 3456 7890" className={cn(inputClass, "tabular pl-11", className)} {...rest} />
    </div>
  );
}

const ALPHABET = /[^0-9A-HJKMNP-TV-Z]/g;
// Input kode akses dengan mask MNP-XXXX-XXXX-XXXX
export function AccessCodeInput({ name, className, ...rest }: ComponentProps<"input">) {
  const t = useT();
  const [value, setValue] = useState("");
  function mask(raw: string) {
    let s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (s.startsWith("MNP") && s.length > 3) s = s.slice(3);
    s = s.replace(/O/g, "0").replace(/[IL]/g, "1").replace(ALPHABET, "").slice(0, 12);
    const parts = s.match(/.{1,4}/g) ?? [];
    return parts.length ? "MNP-" + parts.join("-") : "";
  }
  return (
    <input
      {...rest}
      name={name}
      autoComplete="off"
      spellCheck={false}
      placeholder={t("MNP-XXXX-XXXX-XXXX")}
      className={cn(inputClass, "tabular h-12 text-center font-semibold tracking-[0.12em] uppercase", className)}
      value={value}
      onChange={(e) => setValue(mask(e.target.value))}
    />
  );
}
