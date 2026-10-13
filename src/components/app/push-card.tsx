"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, Share, Smartphone, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/features/account/push-actions";
import { useT } from "@/i18n/client";
import { QrImage } from "./qr-image";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function keyToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// Kartu "Pasang Monaplan di HP" (DESIGN.md 20.8). Tidak tampil bila sudah terpasang atau pernah ditutup di perangkat ini.
// desktop: di komputer tampilkan QR agar halaman ini bisa dibuka di HP lalu dipasang dari sana
export function InstallHint({ className, desktop }: { className?: string; desktop?: boolean }) {
  const t = useT();
  const [show, setShow] = useState<"android" | "ios" | "desktop" | null>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem("mp-install-hint") === "0"; } catch {}
    // Hanya untuk HP dan tablet: di komputer kartu ini tidak relevan
    const mobile = window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(max-width: 1024px)").matches;
    if (dismissed || isStandalone()) return;
    if (!mobile) { if (desktop) { setUrl(`${window.location.origin}/mulai`); setShow("desktop"); } return; }
    if (isIos()) { setShow("ios"); return; }
    const update = () => setShow(window.__mpInstall ? "android" : null);
    update();
    window.addEventListener("mp-installable", update);
    return () => window.removeEventListener("mp-installable", update);
  }, [desktop]);
  if (!show) return null;
  const hide = () => { setShow(null); try { localStorage.setItem("mp-install-hint", "0"); } catch {} };
  return (
    <div className={`relative flex items-start gap-3 rounded-2xl border border-plum-100 bg-plum-50 p-4 pr-12 ${className ?? ""}`}>
      <Smartphone className="mt-0.5 size-5 shrink-0 text-plum-600" />
      <div className="min-w-0 text-[13px] text-neutral-700">
        <p className="font-semibold text-neutral-900">{t("Pasang Monaplan di HP")}</p>
        {show === "desktop" ? (
          <div className="mt-1 flex items-center gap-4">
            <p className="max-w-md">{t("Pindai QR ini dengan kamera HP untuk membuka Monaplan, lalu pasang ke layar utama. Pengingat tugas, pembayaran, dan RSVP akan muncul sebagai notifikasi di HP.")}</p>
            {url && <QrImage value={url} label={t("QR untuk membuka Monaplan di HP")} className="size-24 shrink-0 border border-plum-100" />}
          </div>
        ) : show === "android" ? (
          <>
            <p className="mt-0.5">{t("Buka lebih cepat dari layar utama dan terima pengingat seperti aplikasi biasa.")}</p>
            <Button size="sm" className="mt-3" onClick={async () => { const e = window.__mpInstall; if (!e) return; await e.prompt(); window.__mpInstall = null; hide(); }}>{t("Pasang")}</Button>
          </>
        ) : (
          <p className="mt-0.5">{t("Ketuk")} <Share className="inline size-4 align-[-3px] text-plum-700" aria-label={t("Bagikan")} /> {t("lalu pilih Tambahkan ke Layar Utama. Di iPhone, notifikasi hanya bisa diterima setelah Monaplan dipasang.")}</p>
        )}
      </div>
      <button type="button" onClick={hide} aria-label={t("Tutup")} className="absolute top-2 right-2 inline-flex size-10 items-center justify-center rounded-full text-neutral-500 hover:bg-plum-100"><X className="size-4" /></button>
    </div>
  );
}

// Akun > Notifikasi di HP: saklar per perangkat dan tombol kirim tes (PRD 21.5)
export function PushCard() {
  const t = useT();
  const toast = useToast();
  const [state, setState] = useState<"loading" | "unsupported" | "needs-install" | "denied" | "off" | "on">("loading");
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      if (!VAPID || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(isIos() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  function toggle(next: boolean) {
    start(async () => {
      try {
        const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
        await navigator.serviceWorker.ready;
        if (next) {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
          const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID) }));
          const r = await savePushSubscription(sub.toJSON(), navigator.userAgent);
          if (!r.ok) { await sub.unsubscribe().catch(() => {}); toast(r.error, "danger"); setState("off"); return; }
          toast(r.message ?? t("Tersimpan."));
          setState("on");
        } else {
          const sub = await reg.pushManager.getSubscription();
          if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe().catch(() => {}); }
          setState("off");
        }
      } catch {
        toast(t("Notifikasi tidak bisa diaktifkan di peramban ini."), "danger");
        setState("off");
      }
    });
  }

  if (state === "unsupported" && !VAPID) return null;
  return (
    <Card tour="akun-push">
      <CardHeader icon={<BellRing />} title={t("Notifikasi di HP")} subtitle={t("Pengingat tugas, pembayaran, agenda, dan RSVP muncul langsung di perangkat ini.")} />
      <InstallHint className="mb-4" />
      {state === "needs-install" ? (
        <p className="text-[13px] text-neutral-600">{t("Pasang Monaplan ke Layar Utama dulu, lalu buka dari ikonnya untuk mengaktifkan notifikasi.")}</p>
      ) : state === "unsupported" ? (
        <p className="text-[13px] text-neutral-600">{t("Peramban ini belum mendukung notifikasi. Coba Chrome di Android atau Safari di iPhone yang sudah memasang Monaplan.")}</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] font-medium text-neutral-900">{t("Notifikasi di perangkat ini")}</span>
            <Switch checked={state === "on"} disabled={pending || state === "loading" || state === "denied"} label={t("Notifikasi di perangkat ini")} onChange={toggle} />
          </div>
          {state === "denied" && <p className="mt-3 text-[13px] text-caution">{t("Izin notifikasi ditolak. Buka pengaturan situs di peramban, izinkan notifikasi untuk Monaplan, lalu muat ulang halaman ini.")}</p>}
          {state === "on" && (
            <Button size="sm" variant="outline" className="mt-3" loading={pending} onClick={() => start(async () => { const r = await sendTestPush(); toast(r.ok ? r.message ?? "" : r.error, r.ok ? "positive" : "danger"); })}>{t("Kirim tes")}</Button>
          )}
        </>
      )}
    </Card>
  );
}
