"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { WEDDING_STYLES, WEDDING_STYLE_IDS, type WeddingStyleId } from "@/content/wedding-styles";
import { useT } from "@/i18n/client";

// Kartu pilihan gaya pernikahan (Umum atau adat). Nilainya ikut terkirim sebagai kolom form `name`, atau lewat onChange.
export function StylePicker({ name, defaultValue = "umum", onChange, disabled }: { name?: string; defaultValue?: string; onChange?: (v: WeddingStyleId) => void; disabled?: boolean }) {
  const t = useT();
  const gid = useId();
  const [value, setValue] = useState<WeddingStyleId>(defaultValue as WeddingStyleId);
  return (
    <div role="radiogroup" aria-label={t("Gaya pernikahan")} className="grid gap-2 sm:grid-cols-2">
      {name && <input type="hidden" name={name} value={value} />}
      {WEDDING_STYLE_IDS.map((id) => {
        const s = WEDDING_STYLES[id];
        const on = value === id;
        return (
          <button
            key={id}
            id={`${gid}-${id}`}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => { setValue(id); onChange?.(id); }}
            className={cn(
              "relative flex min-h-[76px] flex-col gap-1 rounded-xl border p-3.5 text-left transition-colors disabled:opacity-60",
              on ? "border-plum-500 bg-plum-50 ring-2 ring-plum-100" : "border-neutral-200 bg-surface hover:border-plum-300",
            )}
          >
            <span className="flex items-center justify-between gap-2 text-sm font-semibold text-neutral-900">
              {t(s.label)}
              {on && <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-plum-600 text-white"><Check className="size-3" aria-hidden="true" /></span>}
            </span>
            <span className="text-[12.5px] leading-[18px] text-neutral-600">{t(s.description)}</span>
          </button>
        );
      })}
    </div>
  );
}
