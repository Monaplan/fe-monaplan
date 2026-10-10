"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/i18n/client";

// Siapa bisa melakukan apa di satu ruang kerja. Isinya mengikuti aturan peran yang sudah ada di aplikasi
// (Owner, Editor, Viewer) dan halaman RSVP tamu tanpa akun.
const ROLES = [
  {
    key: "owner", tab: "Kamu", badge: "Pemilik", title: "Kamu memegang kendali",
    points: ["Mengisi data pernikahan, budget, dan acara", "Mengundang pasangan dan keluarga, sebanyak yang diizinkan paketmu", "Memilih tema undangan RSVP dan mencetak rundown PDF"],
    perms: [true, true, true, true],
  },
  {
    key: "editor", tab: "Pasangan", badge: "Editor", title: "Pasangan ikut mengerjakan",
    points: ["Mencentang tugas dan mencatat pembayaran", "Mengelola vendor dan daftar tamu bersama", "Mendapat notifikasi saat tamu mengonfirmasi hadir"],
    perms: [true, true, true, false],
  },
  {
    key: "viewer", tab: "Keluarga dan panitia", badge: "Viewer", title: "Keluarga cukup melihat",
    points: ["Melihat rundown, jadwal, dan progres persiapan", "Tidak bisa mengubah data, jadi tidak ada yang tergeser tanpa sengaja", "Tidak perlu membayar untuk ikut melihat"],
    perms: [true, false, false, false],
  },
  {
    key: "guest", tab: "Tamu", badge: "Tanpa akun", title: "Tamu cukup membuka satu tautan",
    points: ["Menerima link RSVP pribadi lewat WhatsApp", "Memilih hadir, tidak hadir, atau ragu, plus jumlah orang dan ucapan", "Melihat acara, lokasi, dan dress code dalam tema undangan pilihanmu"],
    perms: [false, false, false, false],
  },
] as const;
const ABILITIES = ["Melihat progres", "Mengubah tugas dan budget", "Mengelola vendor dan tamu", "Mengundang orang"];

export function RolesTabs() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const r = ROLES[i]!;
  return (
    <div className="mx-auto max-w-5xl">
      <div role="tablist" aria-label={t("Peran di ruang kerja")} className="mx-auto mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-neutral-100 p-1">
        {ROLES.map((x, idx) => (
          <button key={x.key} role="tab" id={`rt-${x.key}`} aria-selected={idx === i} aria-controls="rt-panel" tabIndex={idx === i ? 0 : -1} onClick={() => setI(idx)}
            onKeyDown={(e) => { if (e.key === "ArrowRight") setI((i + 1) % ROLES.length); if (e.key === "ArrowLeft") setI((i + ROLES.length - 1) % ROLES.length); }}
            className={cn("h-9 shrink-0 rounded-full px-4 text-[13px] font-medium whitespace-nowrap transition-colors", idx === i ? "bg-surface text-plum-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900")}>
            {t(x.tab)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="rt-panel" aria-labelledby={`rt-${r.key}`} key={r.key} className="animate-sheet-in grid gap-5 rounded-3xl border border-neutral-200/80 bg-surface p-6 shadow-card md:grid-cols-[1.2fr_1fr] md:p-8">
        <div>
          <span className="inline-flex rounded-full bg-plum-100 px-3 py-1 text-[11px] font-semibold tracking-wide text-plum-700 uppercase">{t(r.badge)}</span>
          <h3 className="mt-3 font-display text-[28px] leading-8 font-medium text-neutral-900">{t(r.title)}</h3>
          <ul className="mt-4 space-y-3">
            {r.points.map((p) => <li key={p} className="flex items-start gap-2.5 text-[14.5px] leading-6 text-neutral-700"><Check className="mt-1 size-4 shrink-0 text-plum-600" aria-hidden="true" />{t(p)}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl bg-plum-50 p-4">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-plum-700 uppercase">{t("Yang bisa dilakukan")}</p>
          {r.key === "guest" ? (
            <p className="text-[13.5px] leading-6 text-neutral-700">{t("Tamu tidak masuk ke ruang kerja. Mereka hanya melihat halaman undangan dan mengirim konfirmasi.")}</p>
          ) : (
            <ul className="space-y-2">
              {ABILITIES.map((a, idx) => (
                <li key={a} className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2 text-[13px] text-neutral-800">
                  {r.perms[idx] ? <Check className="size-4 shrink-0 text-plum-600" aria-hidden="true" /> : <Lock className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />}
                  <span className={r.perms[idx] ? "" : "text-neutral-500"}>{t(a)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
