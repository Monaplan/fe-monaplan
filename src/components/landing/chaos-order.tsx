"use client";

import { useState } from "react";
import { Check, FileSpreadsheet, MessageCircle, StickyNote, Receipt } from "lucide-react";
import { useI18n } from "@/i18n/client";

// Sebelum dan sesudah: kolase catatan berserakan di atas satu halaman Monaplan yang rapi.
// Penggeser membuka sisi rapi. Seluruhnya CSS dan satu input range, tanpa gambar dan tanpa pustaka.
const AMOUNT = "Rp 5.000.000";

export function ChaosOrder() {
  const { t } = useI18n();
  const [v, setV] = useState(50);

  return (
    <div className="mx-auto max-w-4xl focus-within:[&>div:first-child]:ring-2 focus-within:[&>div:first-child]:ring-plum-400">
      <div className="relative h-[360px] overflow-hidden rounded-3xl border border-neutral-200/80 bg-surface shadow-card sm:h-[400px]">
        {/* Sisi rapi (di bawah) */}
        <div className="absolute inset-0 flex items-center justify-center p-5 sm:p-8" aria-hidden={v > 95}>
          <div className="w-full max-w-md rounded-2xl border border-neutral-200/80 bg-surface p-4 shadow-pop">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-neutral-900">{t("Raka & Nadia")}</p>
              <span className="rounded-full bg-plum-100 px-2.5 py-0.5 text-[11px] font-semibold text-plum-700">{t("127 hari lagi")}</span>
            </div>
            <ul className="mt-3 space-y-2 text-[13px]">
              {[t("Tamu: 120 undangan, 84 hadir"), t("Budget: 56% terpakai"), t("Vendor: 6 deal, 2 menunggu DP"), t("Tugas: 14 dari 23 selesai")].map((x) => (
                <li key={x} className="flex items-center gap-2.5 rounded-lg bg-neutral-50 px-3 py-2 text-neutral-800"><span className="inline-flex size-4 items-center justify-center rounded-full bg-plum-600 text-white"><Check className="size-3" /></span>{x}</li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-neutral-500">{t("Satu halaman, dilihat berdua.")}</p>
          </div>
        </div>

        {/* Sisi berantakan (di atas, dipotong oleh penggeser) */}
        <div className="absolute inset-0 bg-[#EFE7EA] dark:bg-[#2A2024]" style={{ clipPath: `inset(0 ${100 - v}% 0 0)` }} aria-hidden={v < 5}>
          <div className="relative size-full">
            <div className="absolute top-6 left-[6%] w-44 -rotate-6 rounded-2xl rounded-bl-sm bg-[#DCF8C6] p-3 text-[12px] leading-4 text-[#1F2A1A] shadow-md">
              <MessageCircle className="mb-1 size-3.5 text-[#128C7E]" />{t("DP katering udah transfer belum ya?")}
            </div>
            <div className="absolute top-8 right-[8%] hidden w-40 rotate-3 rounded-lg bg-white p-2 text-[10px] text-[#3B3438] shadow-md sm:block">
              <FileSpreadsheet className="mb-1 size-3.5 text-[#1D7A46]" />
              <div className="grid grid-cols-3 gap-px bg-neutral-200">{Array.from({ length: 9 }, (_, i) => <span key={i} className="bg-white px-1 py-0.5 text-[#2B2528]">{["Nama", "Pax", "?", "Pak Budi", "2", "ragu", "Bu Ani", "3", "-"][i]}</span>)}</div>
              <p className="mt-1 text-[#6B6368]">{t("daftar_tamu_v7_FIX.xlsx")}</p>
            </div>
            <div className="absolute top-[38%] left-[12%] w-36 rotate-2 bg-[#FFF3A3] p-3 text-[12px] leading-4 text-[#4A3F00] shadow-md">
              <StickyNote className="mb-1 size-3.5" />{t("jangan lupa fitting baju minggu depan!!")}
            </div>
            <div className="absolute bottom-10 left-[30%] w-40 -rotate-3 rounded-lg bg-white p-3 text-[11px] text-[#3B3438] shadow-md">
              <Receipt className="mb-1 size-3.5 text-[#6B6368]" />{t("Transfer berhasil")}<p className="tabular mt-0.5 text-[13px] font-semibold text-[#1F1A1C]">{AMOUNT}</p><p className="text-[#6B6368]">{t("untuk apa ya ini?")}</p>
            </div>
            <div className="absolute right-[10%] bottom-8 hidden w-36 rotate-6 rounded-2xl rounded-br-sm bg-white p-3 text-[12px] leading-4 text-[#2B2528] shadow-md sm:block">
              <MessageCircle className="mb-1 size-3.5 text-[#128C7E]" />{t("Fotografernya jadi yang mana, sayang?")}
            </div>
            <span className="absolute bottom-4 left-5 rounded-full bg-[#4A4347] px-3 py-1 text-[11px] font-medium text-white">{t("Sebelum")}</span>
          </div>
        </div>
        <span className="absolute right-5 bottom-4 rounded-full bg-plum-600 px-3 py-1 text-[11px] font-medium text-white">{t("Sesudah")}</span>

        {/* Garis dan pegangan penggeser */}
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" style={{ left: `${v}%` }} aria-hidden="true">
          <span className="absolute top-1/2 left-1/2 inline-flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-surface text-[11px] font-bold text-plum-700 shadow-pop">⇆</span>
        </div>
        <input type="range" min={0} max={100} value={v} onChange={(e) => setV(Number(e.target.value))} aria-label={t("Geser untuk membandingkan sebelum dan sesudah")}
          className="absolute inset-0 size-full cursor-ew-resize opacity-0" />
      </div>
      <p className="mt-3 text-center text-[13px] text-neutral-500">{t("Geser untuk melihat bedanya.")}</p>
    </div>
  );
}
