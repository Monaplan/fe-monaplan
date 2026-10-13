"use client";

import { useEffect, useState } from "react";
import { BellRing, CircleCheck, Download, EllipsisVertical, Plus, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { useT } from "@/i18n/client";
import { QrImage } from "./qr-image";

// Cara memasang Monaplan di HP (Android dan iPhone). Dipakai di landing, Panduan Penggunaan, dan Pusat Bantuan.
// Di Android yang mendukung, tombol Pasang langsung memunculkan dialog pemasangan.
export function InstallGuide({ className, compact, qrPath = "/mulai" }: { className?: string; compact?: boolean; qrPath?: string }) {
  const t = useT();
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setOrigin(window.location.origin);
    const ua = navigator.userAgent;
    setPlatform(/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : /android/i.test(ua) ? "android" : "other");
    const update = () => setCanPrompt(!!window.__mpInstall);
    update();
    window.addEventListener("mp-installable", update);
    return () => window.removeEventListener("mp-installable", update);
  }, []);

  const install = async () => {
    const e = window.__mpInstall;
    if (!e) return;
    await e.prompt();
    const { outcome } = await e.userChoice.catch(() => ({ outcome: "dismissed" }));
    window.__mpInstall = null;
    setCanPrompt(false);
    if (outcome === "accepted") setInstalled(true);
  };

  if (installed) {
    return (
      <p className={cn("flex items-center gap-2 rounded-xl bg-plum-50 px-4 py-3 text-[13.5px] font-medium text-plum-700", className)}>
        <CircleCheck className="size-4 shrink-0" />{t("Monaplan sudah terpasang di perangkat ini.")}
      </p>
    );
  }

  // Tiap langkah: kalimat pendek, lalu tombol peramban yang dimaksud sebagai chip di baris sendiri (tidak terpotong)
  const step = (n: number, text: string, chipIcon: React.ReactNode, chipLabel: string) => (
    <li className="flex items-start gap-3">
      <span className="tabular inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-plum-100 text-[12px] font-bold text-plum-700">{n}</span>
      <span className="flex min-w-0 flex-col items-start gap-1.5 pt-0.5">
        <span className="text-[13.5px] leading-5 text-neutral-700">{text}</span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 max-w-full text-[12.5px] leading-4 font-semibold text-neutral-900 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-plum-600">{chipIcon}{chipLabel}</span>
      </span>
    </li>
  );
  const card = (key: "android" | "ios", name: string, steps: React.ReactNode, action?: React.ReactNode) => (
    <div className={cn("flex h-full flex-col rounded-2xl border bg-surface p-5", platform === key ? "border-plum-300 ring-2 ring-plum-100" : "border-neutral-200")}>
      <p className="flex items-center gap-2 text-[15px] font-semibold text-neutral-900">
        <Smartphone className="size-4 text-plum-600" aria-hidden="true" />{name}
        {platform === key && <span className="rounded-full bg-plum-100 px-2 py-0.5 text-[11px] font-semibold text-plum-700">{t("HP kamu")}</span>}
      </p>
      <ol className="mt-4 mb-4 space-y-3.5">{steps}</ol>
      <p className="mt-auto flex items-center gap-1.5 border-t border-neutral-100 pt-3.5 text-[12.5px] text-neutral-600 [&_svg]:size-3.5 [&_svg]:text-plum-600">
        <CircleCheck aria-hidden="true" />{t("Ikon Monaplan muncul di layar utama.")}
      </p>
      {action}
    </div>
  );

  const android = card("android", t("Android"), <>
    {step(1, t("Buka Monaplan di peramban"), null, "Chrome")}
    {step(2, t("Ketuk menu di kanan atas"), <EllipsisVertical />, t("Menu"))}
    {step(3, t("Pilih"), <Download />, t("Instal aplikasi"))}
  </>, canPrompt && platform === "android" ? <Button size="sm" className="mt-4 self-start" icon={<Download />} onClick={install}>{t("Pasang sekarang")}</Button> : null);
  const ios = card("ios", t("iPhone dan iPad"), <>
    {step(1, t("Buka Monaplan di peramban"), null, "Safari")}
    {step(2, t("Ketuk Bagikan di bawah layar"), <Share />, t("Bagikan"))}
    {step(3, t("Pilih"), <Plus />, t("Tambahkan ke Layar Utama"))}
  </>);

  return (
    <div className={cn("@container flex flex-col gap-3", className)}>
      {/* Dibuka dari komputer: QR untuk membuka halaman yang sama di HP */}
      {platform === "other" && origin && (
        <div className="flex items-center gap-4 rounded-2xl border border-plum-100 bg-plum-50 p-3 pr-5">
          <QrImage value={`${origin}${qrPath}`} label={t("QR untuk membuka Monaplan di HP")} className="size-20 shrink-0" />
          <p className="text-[13px] leading-5 text-neutral-700"><b className="block text-[14px] text-neutral-900">{t("Sedang di komputer?")}</b>{t("Pindai QR ini dengan kamera HP untuk membuka Monaplan di HP, lalu ikuti langkah di bawah.")}</p>
        </div>
      )}
      <div className="grid items-stretch gap-3 @lg:grid-cols-2">{platform === "ios" ? <>{ios}{android}</> : <>{android}{ios}</>}</div>
      {!compact && (
        <p className="flex items-start gap-2.5 rounded-xl bg-plum-50/70 px-4 py-3 text-[13px] leading-5 text-neutral-600">
          <BellRing className="mt-0.5 size-4 shrink-0 text-plum-600" aria-hidden="true" />
          {t("Setelah terpasang, buka Akun lalu nyalakan Notifikasi di perangkat ini agar pengingat muncul di HP. Di iPhone, notifikasi hanya bisa dinyalakan dari Monaplan yang sudah dipasang (iOS 16.4 ke atas).")}
        </p>
      )}
    </div>
  );
}
