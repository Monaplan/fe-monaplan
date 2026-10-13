"use client";

import { useRef, useState, useTransition } from "react";
import { PiggyBank, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/inputs";
import { AnchoredPopover } from "@/components/ui/anchored-popover";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { ProgressBar } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { formatDateCompact, formatIDR, formatIDRShort, todayISO } from "@/lib/format";
import { fundingSplit, savingsPlan, type Side, type SideTotals } from "@/lib/budget";
import { PARTY_SIDE, labelOf } from "@/lib/constants";
import { saveSavings, saveSplitPct } from "./actions";
import { useI18n } from "@/i18n/client";

type ItemLite = { id: string; name: string; estimated_idr: number; actual_idr: number | null; funded_by?: Side | null; category_id: string };
type PaymentLite = { budget_item_id: string | null; amount_idr: number; status: string };

// Kartu Target Tabungan di halaman Budget (DESIGN.md 20.4)
export function SavingsCard({ projectId, tz, items, payments, savings, updatedAt, weddingDate, canWrite, settingsHref }: {
  projectId: string; tz: string; items: ItemLite[]; payments: PaymentLite[]; savings: number; updatedAt: string | null;
  weddingDate: string | null; canWrite: boolean; settingsHref: string;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const plan = savingsPlan({ items, payments, savings, weddingDate, today: todayISO(tz) });
  const progress = plan.need ? Math.min(1, savings / plan.need) : 1;

  return (
    <Card tour="budget-savings" className="mb-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-medium text-neutral-600"><PiggyBank className="size-4 text-plum-600" />{t("Target Tabungan")}</p>
          {!weddingDate ? (
            <p className="mt-2 text-[14px] text-neutral-700">{t("Isi tanggal pernikahan untuk menghitung target.")}{" "}
              <a href={settingsHref} className="font-semibold text-plum-600 hover:underline">{t("Buka Pengaturan")}</a></p>
          ) : plan.shortfall === 0 ? (
            <>
              <p className="mt-1 text-[20px] leading-7 font-bold text-neutral-900">{t("Dana sudah cukup")}</p>
              <p className="mt-1 text-[13px] text-neutral-600">{t("Dana terkumpul menutup seluruh sisa tagihan.")}</p>
            </>
          ) : (
            <>
              <p className="tabular mt-1 text-[24px] leading-8 font-bold tracking-[-0.02em] text-neutral-900">
                {formatIDR(plan.perMonth)}<span className="text-[15px] font-semibold text-neutral-500"> / {t("bulan")}</span></p>
              <p className="mt-1 text-[13px] text-neutral-600">{t("Selama {n} bulan, sampai {date} (2 minggu sebelum hari H).", { n: plan.months ?? 1, date: formatDateCompact(plan.deadline, tz, lang) })}</p>
            </>
          )}
        </div>
        <div className="w-full md:max-w-[340px]">
          <div className="mb-2 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-neutral-600">{t("Dana terkumpul")}</span>
            <span className="tabular text-neutral-700"><b className="text-neutral-900">{formatIDRShort(savings)}</b> {t("dari {v1}", { v1: formatIDRShort(plan.need) })}</span>
          </div>
          <ProgressBar value={progress} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[12px] text-neutral-500">{updatedAt ? t("Diperbarui {date}", { date: formatDateCompact(updatedAt, tz, lang) }) : t("Belum pernah diisi")}</span>
            {canWrite && <button ref={btn} type="button" onClick={() => setOpen((o) => !o)} className="text-[13px] font-semibold text-plum-600 hover:underline">{t("Perbarui dana terkumpul")}</button>}
          </div>
          {open && (
            <AnchoredPopover anchor={btn} onClose={() => setOpen(false)} width={300}>
              <ActionForm action={(fd) => saveSavings(projectId, fd)} onSuccess={() => setOpen(false)} className="gap-3 p-4">
                <label htmlFor="sv-amount" className="text-[13px] font-semibold text-neutral-800">{t("Dana yang sudah terkumpul")}</label>
                <CurrencyInput id="sv-amount" name="savings_idr" defaultValue={savings} autoFocus />
                <SubmitButton size="sm">{t("Simpan")}</SubmitButton>
              </ActionForm>
            </AnchoredPopover>
          )}
        </div>
      </div>
    </Card>
  );
}

// Tab Per Pihak (DESIGN.md 20.3)
export function SplitView({ projectId, items, payments, splitPct, canWrite }: {
  projectId: string; items: ItemLite[]; payments: PaymentLite[]; splitPct: number; canWrite: boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [pct, setPct] = useState(splitPct);
  const [pending, start] = useTransition();
  const r = fundingSplit(items, payments, pct);
  const changed = pct !== splitPct;

  const sideCard = (side: "pria" | "wanita", s: SideTotals) => (
    <Card key={side}>
      <p className="text-[11px] font-semibold tracking-widest text-plum-700 uppercase">{t(labelOf(PARTY_SIDE, side))}</p>
      <p className="tabular mt-1 text-[24px] leading-8 font-bold tracking-[-0.02em] text-neutral-900">{formatIDR(s.plan)}</p>
      <ProgressBar value={s.plan ? s.paid / s.plan : 0} className="mt-3" />
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
        <div><dt className="text-neutral-500">{t("Sudah dibayar")}</dt><dd className="tabular font-semibold text-neutral-900">{formatIDR(s.paid)}</dd></div>
        <div className="text-right"><dt className="text-neutral-500">{t("Sisa")}</dt><dd className="tabular font-semibold text-neutral-900">{formatIDR(s.remaining)}</dd></div>
      </dl>
      {r.sharedPlan > 0 && <p className="mt-3 text-[12px] text-neutral-500">{t("Termasuk porsi biaya bersama {n}%", { n: side === "pria" ? r.pct : 100 - r.pct })}</p>}
    </Card>
  );

  const bySide = (side: Side) => items.filter((i) => (i.funded_by ?? "bersama") === side);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">{sideCard("pria", r.pria)}{sideCard("wanita", r.wanita)}</div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-neutral-800"><Users className="size-4 text-plum-600" />{t("Porsi biaya bersama")}</p>
            <p className="mt-0.5 text-[13px] text-neutral-600">{t("Pihak pria {a}% · Pihak wanita {b}%", { a: pct, b: 100 - pct })}</p>
          </div>
          {canWrite && (
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} aria-label={t("Porsi pihak pria")} className="w-40 accent-plum-600" />
              <Button size="sm" variant={changed ? "primary" : "outline"} disabled={!changed} loading={pending}
                onClick={() => start(async () => { const res = await saveSplitPct(projectId, pct); toast(res.ok ? res.message ?? t("Tersimpan.") : res.error, res.ok ? "positive" : "danger"); })}>{t("Simpan")}</Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-0 sm:p-0">
        {(["pria", "wanita", "bersama"] as const).map((side) => {
          const list = bySide(side);
          if (!list.length) return null;
          return (
            <div key={side}>
              <p className="flex min-h-[38px] items-center justify-between border-y border-neutral-100 bg-neutral-50 px-4 text-[12px] leading-none font-bold tracking-[0.08em] text-neutral-500 uppercase first:border-t-0 sm:px-5">
                <span>{t(labelOf(PARTY_SIDE, side))}</span><span className="tabular">{list.length}</span>
              </p>
              <ul>
                {list.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0 sm:px-5">
                    <span className="min-w-0 truncate text-sm font-medium text-neutral-800">{i.name}</span>
                    <span className="tabular shrink-0 text-[13px] font-semibold text-neutral-900">{formatIDR(i.actual_idr ?? i.estimated_idr)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {!items.length && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">{t("Belum ada item.")}</p>}
      </Card>
      <p className={cn("text-[12px] text-neutral-500")}>{t("Pilih siapa yang menanggung setiap item lewat form item budget. Pembayaran tanpa item dihitung sebagai biaya bersama.")}</p>
    </div>
  );
}

export function FundingBadge({ side }: { side: Side }) {
  const { t } = useI18n();
  if (side === "bersama") return null;
  return <StatusPill tone="neutral" icon={false}>{t(labelOf(PARTY_SIDE, side))}</StatusPill>;
}
