"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BellRing, Check, CircleAlert, Gift, KeyRound, LayoutGrid, ScanLine, ShieldCheck } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { Button, buttonClass } from "@/components/ui/button";
import { AccessCodeInput } from "@/components/ui/inputs";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/i18n/client";

// Aktivasi dengan kode akses, dipakai saat pembayaran di website dimatikan (penjualan lewat toko atau WhatsApp).
export function CodeActivation({ storeUrl, whatsappUrl }: { storeUrl: string | null; whatsappUrl: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState<{ loading: boolean; error: string | null; success: string | null }>({ loading: false, error: null, success: null });

  async function redeem(fd: FormData) {
    setCode({ loading: true, error: null, success: null });
    try {
      const res = await fetch("/api/access-code/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: fd.get("code") }) });
      const j = await res.json();
      if (!res.ok) return setCode({ loading: false, error: j.message ?? "Kode belum bisa dipakai. Coba lagi.", success: null });
      setCode({ loading: false, error: null, success: j.message });
      setTimeout(() => router.push("/mulai"), 1500);
    } catch {
      setCode({ loading: false, error: "Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.", success: null });
    }
  }

  const points = [
    { icon: <LayoutGrid />, text: t("14 modul lengkap, dari checklist dan budget sampai check-in tamu di hari H") },
    { icon: <WhatsAppIcon />, text: t("Undangan digital lewat WhatsApp dengan 5 tema") },
    { icon: <BellRing />, text: t("Pengingat DP dan pelunasan masuk ke email dan Google Calendar, jadi tidak ada yang terlewat") },
    { icon: <ScanLine />, text: t("Check-in tamu dengan QR, tautan panitia, dan catatan amplop di hari H") },
    { icon: <Gift />, text: t("Bonus: Rona Impian dan Honeymoon Planner") },
  ];
  const steps = [t("Beli kode"), t("Terima kode"), t("Aktifkan")];
  const hasBuy = !!(storeUrl || whatsappUrl);

  return (
    <article className="reveal mx-auto mt-10 grid max-w-4xl overflow-hidden rounded-3xl border border-neutral-200/80 bg-surface shadow-modal sm:mt-12 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="brand-canvas relative order-2 flex flex-col overflow-hidden p-6 text-white sm:p-9 md:order-1">
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-14 size-56 rounded-full border border-white/10" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-6 -bottom-6 size-40 rounded-full border border-white/10" />
        <p className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase">{t("Akses selamanya")}</p>
        <h2 className="mt-3 font-display text-[36px] leading-10 font-medium">{t("Aktifkan Monaplan")}</h2>
        <p className="mt-2 text-[14px] leading-6 text-white/75">{t("Satu kode untuk akses selamanya ke semua modul persiapan pernikahan.")}</p>
        <ul className="relative mt-6 space-y-4">
          {points.map((x) => (
            <li key={x.text} className="flex items-start gap-3 text-[13.5px] leading-5 text-white/90">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#EDD1DF] [&_svg]:size-4" aria-hidden="true">{x.icon}</span>
              <span className="pt-1">{x.text}</span>
            </li>
          ))}
        </ul>
        <p className="relative mt-auto flex items-start gap-2.5 pt-7 text-[13px] text-white/80">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#EDD1DF]" aria-hidden="true" />{t("Data tetap aman dan bisa dilihat bila akses berakhir")}
        </p>
      </div>

      <div className="order-1 flex min-w-0 flex-col p-5 sm:p-9 md:order-2">
        <ol className="grid grid-cols-3" aria-label={t("Langkah aktivasi")}>
          {steps.map((s, i) => (
            <li key={s} className="relative flex flex-col items-center gap-1.5 text-center">
              {i < steps.length - 1 && <span aria-hidden="true" className="absolute top-3.5 left-[calc(50%+22px)] right-[calc(-50%+22px)] h-px bg-neutral-200" />}
              <span className={cn("relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold", i === steps.length - 1 ? "bg-plum-600 text-white" : "bg-plum-100 text-plum-700")}>{i + 1}</span>
              <span className={cn("text-[12px] leading-4 font-medium", i === steps.length - 1 ? "text-neutral-900" : "text-neutral-600")}>{s}</span>
            </li>
          ))}
        </ol>

        <div data-tour="aktivasi-code" className="mt-6 sm:mt-7">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-plum-50 text-plum-700"><KeyRound className="size-[18px]" /></span>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">{t("Masukkan kode akses")}</h3>
              <p className="text-[13px] text-neutral-500">{t("Kode dikirim setelah pembayaran di toko terkonfirmasi.")}</p>
            </div>
          </div>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); redeem(new FormData(e.currentTarget)); }}>
            <AccessCodeInput name="code" required aria-label={t("Kode akses")} aria-invalid={!!code.error} />
            <Button type="submit" variant="dark" loading={code.loading} className="shrink-0">{t("Aktifkan")}</Button>
          </form>
          {code.error && <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] text-danger"><CircleAlert className="mt-0.5 size-4 shrink-0" />{t(code.error)}</p>}
          {code.success && <p className="animate-sheet-in mt-3 flex items-center gap-2 rounded-lg bg-plum-100 px-3 py-2 text-[13px] text-plum-800"><Check className="size-4 shrink-0" />{t(code.success)}</p>}
        </div>

        {hasBuy && (
          <div className="mt-auto pt-8">
            <p className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.16em] text-neutral-500 uppercase after:h-px after:flex-1 after:bg-neutral-200">{t("Belum punya kode?")}</p>
            <div className="mt-4 flex flex-col gap-2.5">
              {storeUrl && (
                <a href={storeUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg", "w-full")}>
                  {t("Beli kode akses")}<ArrowUpRight className="ml-0.5" aria-hidden="true" />
                </a>
              )}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass(storeUrl ? "outline" : "primary", "lg", "w-full")}>
                  <WhatsAppIcon className={cn("size-[18px]", storeUrl && "text-[#25D366]")} />{t("Hubungi via WhatsApp")}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
