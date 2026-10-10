"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { ArrowRight, BellRing, Briefcase, Check, CircleAlert, CircleCheck, Gift, KeyRound, LayoutGrid, Printer, ShieldCheck, Tag, Users, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { BONUSES, BONUS_TOTAL } from "@/content/bonus";
import { Button } from "@/components/ui/button";
import { AccessCodeInput } from "@/components/ui/inputs";
import { Input } from "@/components/ui/form";
import { StatusPill } from "@/components/ui/pill";
import { cn } from "@/components/ui/cn";
import { formatDateCompact, formatIDR } from "@/lib/format";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useI18n } from "@/i18n/client";
import { CountUp } from "@/components/ui/count-up";

type Pricing = { original: number; final: number; credit: number; promoName: string | null; promoEndsAt: string | null; promoDaysLeft: number | null };
type PromoStatus = { state: "none" | "applied" | "invalid"; message: string | null };

type Plan = { id: string; name: string; description?: string | null; type: "lifetime" | "timed"; duration_days: number | null; price_idr: number; max_collaborators: number; max_projects?: number; storage_quota_mb: number };

declare global {
  interface Window {
    snap?: {
      pay: (token: string, opts: Record<string, (r?: unknown) => void>) => void;
      embed: (token: string, opts: Record<string, unknown>) => void;
    };
  }
}


export function ActivationClient({ plans, pricing, isUpgrade, showCode, promoCode, promoStatus, clientKey, isProduction }: { plans: Plan[]; pricing: Record<string, Pricing>; isUpgrade: boolean; showCode: boolean; promoCode: string; promoStatus: PromoStatus; clientKey: string; isProduction: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  // Metode pembayaran Midtrans ditampilkan di halaman (tanpa pop up) setelah token pesanan dibuat server
  const [snapReady, setSnapReady] = useState(false);
  const [embed, setEmbed] = useState<{ token: string; orderNumber: string; planId: string; redirectUrl: string } | null>(null);
  const [code, setCode] = useState<{ loading: boolean; error: string | null; success: string | null }>({ loading: false, error: null, success: null });
  const [promoInput, setPromoInput] = useState(promoCode);
  const [promoBusy, setPromoBusy] = useState(false);

  function applyPromo(value: string) {
    const v = value.trim();
    setPromoBusy(true);
    window.location.assign(v ? `/aktivasi?promo=${encodeURIComponent(v)}` : "/aktivasi");
  }
  useEffect(() => { setPromoBusy(false); setPromoInput(promoCode); }, [promoCode, promoStatus]);

  // Pesanan dibuat sekali per pemuatan halaman (mode ketat React menjalankan efek dua kali saat pengembangan)
  const started = useRef(false);
  const embedded = useRef(false);
  const choseMethod = useRef(false);
  useEffect(() => {
    if (!autoPlan || !snapReady || started.current) return;
    started.current = true;
    void pay(autoPlan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapReady]);

  // Keluar dari halaman sebelum memilih metode bayar: order yang menggantung dibatalkan (best effort, sisanya dibersihkan server)
  useEffect(() => {
    if (!embed) return;
    const leave = (e: PageTransitionEvent) => {
      if (e.persisted || choseMethod.current) return;
      navigator.sendBeacon("/api/checkout/cancel", new Blob([JSON.stringify({ order: embed.orderNumber })], { type: "application/json" }));
    };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [embed]);

  useEffect(() => {
    if (!embed || !window.snap || embedded.current) return;
    embedded.current = true;
    const done = () => { choseMethod.current = true; router.push(`/checkout/selesai?order=${embed.orderNumber}`); };
    if (!autoPlan) document.getElementById("snap-embed")?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      window.snap.embed(embed.token, { embedId: "snap-container", onSuccess: done, onPending: done, onError: done });
    } catch (e) {
      // Galat dari Snap tidak boleh menjatuhkan halaman: tampilkan pesan dan beri jalan keluar
      embedded.current = false;
      setPayError(t("Metode pembayaran gagal dimuat. Muat ulang halaman ini lalu coba lagi."));
      setEmbed(null);
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embed, router]);

  const sorted = [...plans].sort((a, b) => (a.type === "lifetime" ? -1 : b.type === "lifetime" ? 1 : 0));
  // Satu paket: metode pembayaran langsung tampil tanpa menekan tombol. Banyak paket: pengguna memilih dulu.
  const autoPlan = sorted.length === 1 && !!clientKey ? sorted[0]! : null;

  async function pay(plan: Plan) {
    setPayError(null);
    setLoadingPlan(plan.id);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: plan.id, ...(promoStatus.state === "applied" && promoCode && { promo_code: promoCode }) }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message ?? "Gagal membuat pembayaran.");
      if (window.snap) {
        setEmbed({ token: j.token, orderNumber: j.orderNumber, planId: plan.id, redirectUrl: j.redirectUrl });
        setLoadingPlan(null);
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
        <Script src={isProduction ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js"} data-client-key={clientKey} strategy="afterInteractive" onReady={() => setSnapReady(true)} />
      )}

      <ProductTour id="aktivasi" steps={TOURS.aktivasi!} />
      <div data-tour="aktivasi-plans" className={cn("mt-10", sorted.length > 1 ? "stagger grid items-stretch gap-5 md:grid-cols-2" : "")}>
        {sorted.map((p) => {
          const lifetime = p.type === "lifetime";
          const price = pricing[p.id] ?? { original: p.price_idr, final: p.price_idr, credit: 0, promoName: null, promoEndsAt: null, promoDaysLeft: null };
          const promo = price.final < price.original - price.credit;
          const base = price.original - price.credit;
          const points = [
            { icon: <LayoutGrid />, text: t("11 modul lengkap, dari checklist dan budget sampai rundown hari H") },
            { icon: <WhatsAppIcon />, text: t("Undangan digital lewat WhatsApp dengan 5 tema, termasuk tema Bali beraksara Bali") },
            { icon: <BellRing />, text: t("Pengingat DP dan pelunasan masuk ke email dan Google Calendar, jadi tidak ada yang terlewat") },
            { icon: <Users />, text: t("Ajak hingga {n} pasangan atau keluarga ikut mengerjakan, tanpa bayar tambahan", { n: p.max_collaborators }) },
            { icon: <CircleCheck />, text: t("Notifikasi langsung saat tamu mengonfirmasi hadir") },
            { icon: <Printer />, text: t("Rundown hari H siap dicetak dalam PDF") },
            ...(p.max_projects && p.max_projects > 1 ? [{ icon: <Briefcase />, text: t("{n} proyek pernikahan", { n: p.max_projects }) }] : []),
          ];
          const label = isUpgrade ? t("Bayar selisih dan upgrade") : sorted.length === 1 ? t("Dapatkan Sekarang") : t("Pilih Paket Ini");
          const cta = (
            <Button size="lg" variant={lifetime ? "primary" : "secondary"} className="w-full" loading={loadingPlan === p.id} disabled={!!loadingPlan || !!embed} onClick={() => pay(p)}>
              {embed?.planId === p.id ? t("Pilih metode pembayaran di bawah") : label}{!loadingPlan && !embed && <ArrowRight className="ml-0.5" />}
            </Button>
          );
          // Pembelian baru satu paket: harga coret adalah total nilai (paket ditambah bonus), sama dengan rincian di bawahnya
          const showValue = !isUpgrade && lifetime && sorted.length === 1;
          const valueTotal = price.original + BONUS_TOTAL;
          const valueSaved = valueTotal - price.final;
          const priceBlock = (
            <>
              {promo && (
                <p className="mt-3 inline-flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  <Tag className="size-3" aria-hidden="true" />{price.promoName ?? t("Promo")}
                  {price.promoEndsAt && <span className="text-white/80">· {t("sampai")} {formatDateCompact(price.promoEndsAt, undefined, lang)}</span>}
                  {price.promoDaysLeft !== null && price.promoDaysLeft <= 7 && <b className="text-[#F3C969]">{price.promoDaysLeft <= 1 ? t("berakhir hari ini") : t("{n} hari lagi", { n: price.promoDaysLeft })}</b>}
                </p>
              )}
              <p className="tabular mt-4 text-[52px] leading-[56px] font-bold tracking-tight"><CountUp value={price.final} kind="idr" duration={900} /></p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2.5 text-[14px] text-white/75">
                {showValue ? (valueTotal > price.final && <s className="tabular">{formatIDR(valueTotal)}</s>) : (promo || price.credit > 0) && <s className="tabular">{formatIDR(price.original)}</s>}
              </p>
              {price.credit > 0 && <p className="mt-1 text-[13px] text-white/75">{t("Sudah dikurangi kredit {v1} dari paket sebelumnya.", { v1: formatIDR(price.credit) })}</p>}
              <p className="mt-1 text-[13px] text-white/75">{lifetime ? t("Sekali bayar, akses selamanya") : t("aktif {v1} bulan, bisa diperpanjang", { v1: Math.round((p.duration_days ?? 0) / 30) })}</p>
            </>
          );
          // Rincian nilai: paket, dua bonus, total nilai, dan hemat. Hanya untuk pembelian baru (pada upgrade bonusnya sudah dimiliki).
          const receipt = showValue ? (
            <div className="relative mt-6 rounded-2xl border border-white/15 bg-white/10 p-4 text-[13.5px]">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-white/65 uppercase">{t("Rincian nilai")}</p>
              <ul className="space-y-2">
                {[[p.name, price.original, false], [BONUSES[0].name, BONUSES[0].value, true], [BONUSES[1].name, BONUSES[1].value, true]].map(([n, v, bonus]) => (
                  <li key={n as string} className="flex items-baseline gap-2">
                    <span>{n as string}</span>
                    {bonus && <span className="self-center rounded-full bg-white/20 px-1.5 py-px text-[9.5px] font-semibold tracking-wide uppercase">{t("Bonus")}</span>}
                    <span aria-hidden="true" className="min-w-3 flex-1 translate-y-[-3px] border-b border-dotted border-white/35" />
                    <span className="tabular font-medium">{formatIDR(v as number)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-baseline justify-between border-t border-white/30 pt-2.5">
                <span className="font-semibold">{t("Total nilai")}</span>
                <span className="tabular text-[16px] font-semibold">{formatIDR(valueTotal)}</span>
              </div>
              {valueSaved > 0 && (
                <div className="mt-3 rounded-xl bg-[#F3C969] px-4 py-3.5 text-[#3E1A2D] shadow-sm">
                  <p className="text-[20px] leading-6 font-extrabold tracking-tight">{t("Kamu hemat {v1}!", { v1: formatIDR(valueSaved) })}</p>
                  <p className="tabular mt-1 text-[13px] leading-5 font-medium">{t("Hari ini cukup bayar {v1}, harga sudah didiskon.", { v1: formatIDR(price.final) })}</p>
                </div>
              )}
            </div>
          ) : null;

          if (sorted.length === 1) {
            return (
              <article key={p.id} className="reveal mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-neutral-200/80 bg-surface shadow-modal md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                <div className="brand-canvas relative flex flex-col overflow-hidden p-7 text-white sm:p-9">
                  <span aria-hidden="true" className="pointer-events-none absolute -right-16 -bottom-16 size-64 rounded-full border border-white/10" />
                  <span aria-hidden="true" className="pointer-events-none absolute -right-6 -bottom-6 size-40 rounded-full border border-white/10" />
                  <p className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase">{lifetime ? t("Akses selamanya") : t("Paket")}</p>
                  <h2 className="mt-3 font-display text-[36px] leading-10 font-medium">{p.name}</h2>
                  {priceBlock}
                  {receipt}
                  <ul className="mt-auto space-y-2.5 pt-7 text-[13.5px] text-white/90">
                    {[t("Tanpa biaya bulanan atau perpanjangan"), t("Data tetap aman dan bisa dilihat bila akses berakhir")].map((x) => (
                      <li key={x} className="flex items-start gap-2.5"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#EDD1DF]" aria-hidden="true" />{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col bg-[#FFFFFF] p-7 sm:p-9">
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8C3A63] uppercase">{t("Pilih metode pembayaran")}</p>
                  {autoPlan ? (
                    <>
                      <div key={embed?.token ?? "kosong"} id="snap-container" className={embed ? "mt-4 min-h-[420px] w-full" : "hidden"} />
                      {!embed && !payError && (
                        <div role="status" className="mt-4 flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl bg-[#F6F2F4] text-[13px] text-[#6B6368]">
                          <span className="size-6 animate-spin rounded-full border-2 border-[#EDD1DF] border-t-[#8C3A63]" aria-hidden="true" />{t("Menyiapkan metode pembayaran")}
                        </div>
                      )}
                      {payError && !autoPlan && (
                        <div className="mt-4 rounded-2xl bg-[#FBEAEE] p-4 text-[13px] text-[#B42F4E]">
                          <p className="flex items-start gap-2"><CircleAlert className="mt-0.5 size-4 shrink-0" />{t(payError)}</p>
                          <Button variant="outline" size="sm" className="mt-3 !bg-[#FFFFFF] !text-[#2B2528]" onClick={() => window.location.reload()}>{t("Coba lagi")}</Button>
                        </div>
                      )}
                      <p className="mt-4 flex items-start gap-2 text-[12px] text-[#6B6368]"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#8C3A63]" aria-hidden="true" />{t("Pembayaran diproses langsung oleh Midtrans. Monaplan tidak menyimpan data kartu atau rekeningmu.")}</p>
                    </>
                  ) : (
                    <div className="mt-4 flex flex-1 flex-col justify-end"><div>{cta}</div></div>
                  )}
                </div>
              </article>
            );
          }

          return (
            <div key={p.id} className={cn("hover-lift relative flex flex-col overflow-hidden rounded-2xl", lifetime ? "border-2 border-plum-600" : "border border-neutral-200")}>
              <div className="brand-canvas p-6 text-white">
                <h2 className="text-base font-semibold">{p.name}</h2>
                {priceBlock}
              </div>
              <div className="flex flex-1 flex-col bg-surface p-6">
                <ul className="mb-6 flex-1 space-y-2.5 text-sm text-neutral-700">
                  {points.map((x) => <li key={x.text} className="flex items-start gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-plum-600" />{x.text}</li>)}
                  <li className="flex items-start gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-plum-600" />{t("Bonus: Rona Impian dan Honeymoon Planner")}</li>
                </ul>
                {cta}
              </div>
            </div>
          );
        })}
      </div>
      {payError && <p className="mt-3 flex items-center justify-center gap-2 text-[13px] text-danger"><CircleAlert className="size-4" />{t(payError)}</p>}
      {embed && !autoPlan ? (
        <section id="snap-embed" aria-label={t("Pilih metode pembayaran")} className="animate-sheet-in mx-auto mt-6 max-w-4xl scroll-mt-6 rounded-3xl border border-neutral-200/80 bg-[#FFFFFF] p-4 shadow-card sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#1F1A1C]">{t("Pilih metode pembayaran")}</h2>
            <Button variant="ghost" size="sm" className="!text-[#2B2528] hover:!bg-[#F6F2F4]" onClick={() => window.location.reload()}>{t("Batalkan")}</Button>
          </div>
          <div id="snap-container" className="min-h-[420px] w-full" />
          <p className="mt-3 flex items-center gap-2 text-[12px] text-[#6B6368]"><ShieldCheck className="size-3.5 text-[#8C3A63]" aria-hidden="true" />{t("Pembayaran diproses langsung oleh Midtrans. Monaplan tidak menyimpan data kartu atau rekeningmu.")}</p>
        </section>
      ) : !autoPlan ? (
        <p className="mt-4 text-center text-xs tracking-wide text-neutral-500">{t("QRIS · Virtual Account · GoPay · ShopeePay · Kartu Kredit")}</p>
      ) : null}

      <div className={cn("mt-8 grid gap-5", showCode ? "md:grid-cols-2" : "mx-auto max-w-md")}>
        <div data-tour="aktivasi-promo" className="flex flex-col rounded-2xl border border-neutral-200 bg-surface p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-plum-50 text-plum-700"><Tag className="size-[18px]" /></span>
            <div>
              <h2 className="text-base font-semibold text-neutral-800">{t("Punya kode promo?")}</h2>
              <p className="text-[13px] text-neutral-500">{t("Masukkan kode untuk mendapat potongan harga.")}</p>
            </div>
          </div>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); applyPromo(promoInput); }}>
            <Input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder={t("Contoh: NIKAH2026")} aria-label={t("Kode promo")} aria-invalid={promoStatus.state === "invalid"} maxLength={40} autoCapitalize="characters" spellCheck={false} className="uppercase" />
            <Button type="submit" variant="dark" loading={promoBusy} disabled={!promoInput.trim()} className="shrink-0">{t("Terapkan")}</Button>
          </form>
          {promoStatus.state === "invalid" && <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] text-danger"><CircleAlert className="mt-0.5 size-4 shrink-0" />{promoStatus.message}</p>}
          {promoStatus.state === "applied" && (
            <p className="animate-sheet-in mt-3 flex items-center gap-2 rounded-lg bg-plum-100 px-3 py-2 text-[13px] text-plum-800">
              <Check className="size-4 shrink-0" /><span className="flex-1">{promoStatus.message}</span>
              <button type="button" onClick={() => applyPromo("")} aria-label={t("Hapus kode promo")} className="inline-flex size-6 items-center justify-center rounded-full hover:bg-plum-200"><X className="size-3.5" /></button>
            </p>
          )}
        </div>

        {showCode && (
          <div data-tour="aktivasi-code" className="flex flex-col rounded-2xl border border-neutral-200 bg-surface p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-plum-50 text-plum-700"><KeyRound className="size-[18px]" /></span>
              <div>
                <h2 className="text-base font-semibold text-neutral-800">{t("Punya Kode Akses?")}</h2>
                <p className="text-[13px] text-neutral-500">{t("Kode didapat dari reseller atau promo Monaplan.")}</p>
              </div>
            </div>
            <form
              className="mt-4 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                redeem(new FormData(e.currentTarget));
              }}
            >
              <AccessCodeInput name="code" required aria-label={t("Kode akses")} aria-invalid={!!code.error} />
              <Button type="submit" variant="dark" loading={code.loading} className="shrink-0">{t("Aktifkan")}</Button>
            </form>
            {code.error && <p className="mt-3 flex items-center gap-2 text-[13px] text-danger"><CircleAlert className="size-4 shrink-0" />{t(code.error)}</p>}
            {code.success && <p className="mt-3 flex items-center gap-2 rounded-md bg-plum-100 px-3 py-2 text-[13px] text-plum-800"><Check className="size-4" />{t(code.success)}</p>}
          </div>
        )}
      </div>
    </>
  );
}
