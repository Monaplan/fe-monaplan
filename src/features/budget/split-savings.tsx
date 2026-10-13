"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { formatIDR } from "@/lib/format";
import { fundingSplit, type Side, type SideTotals } from "@/lib/budget";
import { PARTY_SIDE, labelOf } from "@/lib/constants";
import { saveSplitPct } from "./actions";
import { useI18n } from "@/i18n/client";

type ItemLite = { id: string; name: string; estimated_idr: number; actual_idr: number | null; funded_by?: Side | null; category_id: string };
type PaymentLite = { budget_item_id: string | null; amount_idr: number; status: string };

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
