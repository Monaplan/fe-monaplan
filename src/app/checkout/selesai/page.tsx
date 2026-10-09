"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { ButtonLink } from "@/components/ui/button";
import { useT } from "@/i18n/client";

// Hanya membaca status order (polling 3 detik, maks 2 menit). Akses diberikan oleh webhook.
function Waiting() {
  const t = useT();
  const router = useRouter();
  const order = useSearchParams().get("order");
  const [state, setState] = useState<"waiting" | "paid" | "failed" | "timeout">("waiting");

  useEffect(() => {
    if (!order) return;
    const started = Date.now();
    let stop = false;
    async function tick() {
      if (stop) return;
      const res = await fetch(`/api/orders/${order}`, { cache: "no-store" });
      const j = res.ok ? await res.json() : null;
      if (j?.status === "paid") {
        setState("paid");
        setTimeout(() => router.push("/mulai"), 1500);
        return;
      }
      if (j && ["failed", "expired", "cancelled"].includes(j.status)) return setState("failed");
      if (Date.now() - started > 120_000) return setState("timeout");
      setTimeout(tick, 3000);
    }
    tick();
    return () => {
      stop = true;
    };
  }, [order, router]);

  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-surface p-8 text-center">
      <Logo className="mb-6" />
      {state === "waiting" && (
        <>
          <Loader2 className="mx-auto size-10 animate-spin text-plum-600" />
          <h1 className="mt-4 text-xl font-semibold">{t("Menunggu konfirmasi pembayaran")}</h1>
          <p className="mt-2 text-[13px] text-neutral-600">{t("Biasanya hanya beberapa detik. Jangan tutup halaman ini.")}</p>
        </>
      )}
      {state === "paid" && (
        <>
          <CircleCheck className="mx-auto size-10 text-plum-600" />
          <h1 className="mt-4 text-xl font-semibold">{t("Pembayaran berhasil")}</h1>
          <p className="mt-2 text-[13px] text-neutral-600">{t("Akses kamu sudah aktif. Mengarahkan…")}</p>
        </>
      )}
      {(state === "failed" || state === "timeout") && (
        <>
          <CircleAlert className="mx-auto size-10 text-danger" />
          <h1 className="mt-4 text-xl font-semibold">{state === "failed" ? t("Pembayaran tidak berhasil") : t("Pembayaran belum terkonfirmasi")}</h1>
          <p className="mt-2 text-[13px] text-neutral-600">
            {state === "failed" ? t("Transaksi dibatalkan atau kedaluwarsa. Kamu bisa mencoba lagi.") : t("Bila kamu sudah membayar, akses akan aktif otomatis begitu pembayaran terkonfirmasi. Cek riwayat di halaman Akun.")}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <ButtonLink href="/aktivasi" variant="secondary">{t("Kembali")}</ButtonLink>
            <ButtonLink href="/akun/tagihan">{t("Lihat Tagihan")}</ButtonLink>
          </div>
        </>
      )}
    </div>
  );
}

export default function CheckoutDonePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-plum-50 px-4">
      <Suspense>
        <Waiting />
      </Suspense>
    </main>
  );
}
