"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Check, CircleAlert, KeyRound, Sparkles, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccessCodeInput } from "@/components/ui/inputs";
import { StatusPill } from "@/components/ui/pill";
import { cn } from "@/components/ui/cn";
import { formatDateCompact, formatIDR } from "@/lib/format";

type Pricing = { original: number; final: number; promoName: string | null; promoEndsAt: string | null };

type Plan = { id: string; name: string; type: "lifetime" | "timed"; duration_days: number | null; price_idr: number; max_collaborators: number; storage_quota_mb: number };

declare global {
  interface Window {
    snap?: { pay: (token: string, opts: Record<string, (r?: unknown) => void>) => void };
  }
}

const FEATURES = ["Semua 11 modul perencanaan", "Halaman RSVP pribadi untuk tamu", "Pengingat tugas dan pembayaran", "Penyimpanan dokumen privat"];

export function ActivationClient({ plans, pricing, hasAccess, clientKey, isProduction }: { plans: Plan[]; pricing: Record<string, Pricing>; hasAccess: boolean; clientKey: string; isProduction: boolean }) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [code, setCode] = useState<{ loading: boolean; error: string | null; success: string | null }>({ loading: false, error: null, success: null });

  const sorted = [...plans].sort((a, b) => (a.type === "lifetime" ? -1 : b.type === "lifetime" ? 1 : 0));

  async function pay(plan: Plan) {
    setPayError(null);
    setLoadingPlan(plan.id);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: plan.id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message ?? "Gagal membuat pembayaran.");
      const done = () => router.push(`/checkout/selesai?order=${j.orderNumber}`);
      if (window.snap) {
        window.snap.pay(j.token, { onSuccess: done, onPending: done, onError: done, onClose: () => setLoadingPlan(null) });
      } else {
        window.location.href = j.redirectUrl;
      }
    } catch (e) {
      setPayError((e as Error).message);
      setLoadingPlan(null);
    }
  }

  async function redeem(fd: FormData) {
    setCode({ loading: true, error: null, success: null });
    const res = await fetch("/api/access-code/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: fd.get("code") }) });
    const j = await res.json();
    if (!res.ok) return setCode({ loading: false, error: j.message, success: null });
    setCode({ loading: false, error: null, success: j.message });
    setTimeout(() => router.push("/mulai"), 1500);
  }

  return (
    <>
      {clientKey && (
        <Script src={isProduction ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js"} data-client-key={clientKey} strategy="afterInteractive" />
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {sorted.map((p) => {
          const lifetime = p.type === "lifetime";
          const price = pricing[p.id] ?? { original: p.price_idr, final: p.price_idr, promoName: null, promoEndsAt: null };
          const promo = price.final < price.original;
          return (
            <div key={p.id} className={cn("relative flex flex-col rounded-lg bg-surface p-6", lifetime ? "border-2 border-plum-600" : "border border-neutral-200")}>
              {lifetime && <StatusPill tone="positive" icon={<Sparkles />} className="absolute -top-3 left-6">Bayar sekali, selamanya</StatusPill>}
              <h2 className="text-base font-semibold text-neutral-800">{p.name}</h2>
              {promo && (
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                  <StatusPill tone="caution" icon={<Tag />}>{price.promoName ?? "Promo"}</StatusPill>
                  {price.promoEndsAt && <span className="text-neutral-600">sampai {formatDateCompact(price.promoEndsAt)}</span>}
                </p>
              )}
              <p className={cn("tabular text-[32px] leading-10 font-bold text-neutral-900", promo ? "mt-1" : "mt-3")}>
                {formatIDR(price.final)}
                {promo && <s className="ml-2 text-base font-medium text-neutral-500">{formatIDR(price.original)}</s>}
              </p>
              <p className={cn("text-[13px]", lifetime ? "text-plum-700" : "text-neutral-600")}>
                {lifetime ? "sekali bayar, akses selamanya" : `aktif ${Math.round((p.duration_days ?? 0) / 30)} bulan, bisa diperpanjang`}
              </p>
              <p className="mt-4 rounded-md bg-neutral-50 px-3 py-2 text-[13px] text-neutral-700">
                Masa aktif: <b>{lifetime ? "Selamanya" : `${Math.round((p.duration_days ?? 0) / 30)} bulan`}</b>
              </p>
              <ul className="mt-4 mb-6 flex-1 space-y-2 text-sm text-neutral-700">
                {[...FEATURES, `Hingga ${p.max_collaborators} kolaborator`].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="size-4 shrink-0 text-plum-600" />{f}</li>
                ))}
              </ul>
              <Button size="lg" variant={lifetime ? "primary" : "secondary"} className="w-full" loading={loadingPlan === p.id} disabled={!!loadingPlan} onClick={() => pay(p)}>
                {hasAccess ? "Upgrade ke Selamanya" : "Pilih Paket Ini"}
              </Button>
            </div>
          );
        })}
      </div>
      {payError && <p className="mt-3 flex items-center justify-center gap-2 text-[13px] text-danger"><CircleAlert className="size-4" />{payError}</p>}
      <p className="mt-4 text-center text-xs tracking-wide text-neutral-500">QRIS · Virtual Account · GoPay · ShopeePay · Kartu Kredit</p>

      <div className="mt-8 rounded-lg border border-neutral-200 bg-surface p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-700"><KeyRound className="size-[18px]" /></span>
          <div>
            <h2 className="text-base font-semibold text-neutral-800">Punya Kode Akses?</h2>
            <p className="text-[13px] text-neutral-500">Kode didapat dari reseller atau promo Monaplan.</p>
          </div>
        </div>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            redeem(new FormData(e.currentTarget));
          }}
        >
          <AccessCodeInput name="code" required aria-label="Kode akses" aria-invalid={!!code.error} />
          <Button type="submit" size="lg" variant="dark" loading={code.loading} className="sm:w-40">Aktifkan</Button>
        </form>
        {code.error && <p className="mt-3 flex items-center gap-2 text-[13px] text-danger"><CircleAlert className="size-4 shrink-0" />{code.error}</p>}
        {code.success && <p className="mt-3 flex items-center gap-2 rounded-md bg-plum-100 px-3 py-2 text-[13px] text-plum-800"><Check className="size-4" />{code.success}</p>}
      </div>
    </>
  );
}
