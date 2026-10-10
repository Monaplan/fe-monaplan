"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/form";
import { useT } from "@/i18n/client";

// Menu "Urutkan" dan tombol arah. Menulis ?sort=&dir= ke URL dan mempertahankan filter lain.
export function SortSelect({ options, value, dir }: { options: { key: string; label: string }[]; value: string; dir: "asc" | "desc" }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // nextDir kosong = pakai arah bawaan kolom itu (nama naik, tanggal turun, dst.)
  const go = (sort: string, nextDir?: "asc" | "desc") => {
    const p = new URLSearchParams(params.toString());
    p.set("sort", sort);
    if (nextDir) p.set("dir", nextDir); else p.delete("dir");
    router.push(`${pathname}?${p.toString()}`);
  };
  const Arrow = dir === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow;
  return (
    <div className="flex items-center gap-1.5">
      <label className="flex items-center gap-2 text-[13px] text-neutral-600">
        <span className="hidden sm:inline">{t("Urutkan")}</span>
        <Select aria-label={t("Urutkan")} value={value} onChange={(e) => go(e.target.value)} className="w-auto">
          {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </Select>
      </label>
      <button type="button" onClick={() => go(value, dir === "asc" ? "desc" : "asc")} aria-label={dir === "asc" ? t("Urutan naik, klik untuk turun") : t("Urutan turun, klik untuk naik")}
        className="inline-flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-surface text-neutral-600 transition-colors hover:bg-neutral-100">
        <Arrow className="size-4" />
      </button>
    </div>
  );
}
