"use client";

import { useState } from "react";
import { ChevronDown, CircleCheck, RefreshCw } from "lucide-react";
import { ActionButton } from "@/components/ui/action-form";
import { StatusPill, type Tone } from "@/components/ui/pill";
import { cn } from "@/components/ui/cn";
import { formatDateCompact, formatIDR, formatTime } from "@/lib/format";
import { recheckOrder, setOrderReviewed } from "@/features/admin/actions";
import { useI18n } from "@/i18n/client";

const TONE: Record<string, Tone> = { paid: "positive", pending: "caution", failed: "danger", refunded: "danger", expired: "neutral", cancelled: "neutral" };

export function OrderRow({ order }: { order: any }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-neutral-200 last:border-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:gap-x-4 sm:gap-y-1 sm:px-5">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full min-w-0 items-center gap-2 text-left sm:w-auto sm:flex-1">
          <ChevronDown className={cn("size-4 shrink-0 text-neutral-400 transition-transform", !open && "-rotate-90")} />
          <span className="min-w-0">
            <span className="tabular block text-sm font-medium whitespace-nowrap">{order.order_number}</span>
            <span className="block truncate text-xs text-neutral-500">{order.profiles?.email ?? "-"} · {order.plans?.name} · {formatDateCompact(order.created_at, undefined, lang)}{Number(order.discount_idr) > 0 && t("· promo {v1} -{formatIDR}", { v1: order.promo_name ?? "", formatIDR: formatIDR(order.discount_idr) })}</span>
          </span>
        </button>
        <span className="tabular text-sm font-semibold">{formatIDR(order.amount_idr)}</span>
        {order.metadata?.superseded && <span className="text-xs text-neutral-500">{order.metadata?.left_page ? t("Ditinggalkan pembeli") : t("Digantikan order baru")}</span>}
        {order.needs_review && <StatusPill tone="danger">{t("Tinjau")}</StatusPill>}
        <StatusPill tone={TONE[order.status]}>{order.status}</StatusPill>
        <ActionButton size="sm" variant="outline" icon={<RefreshCw />} action={() => recheckOrder(order.id)}>{t("Cek ulang")}</ActionButton>
        {order.needs_review && <ActionButton size="sm" variant="ghost" icon={<CircleCheck />} action={() => setOrderReviewed(order.id)}>{t("Sudah ditinjau")}</ActionButton>}
      </div>
      {open && (
        <div className="bg-neutral-50 px-5 py-3">
          <p className="mb-2 text-xs text-neutral-500">{t("Metode:")}{" "}{order.payment_method ?? "-"}{" "}{t("· Lunas:")}{" "}{order.paid_at ? `${formatDateCompact(order.paid_at, undefined, lang)} ${formatTime(order.paid_at, undefined, undefined, lang)}` : "-"}{" "}{t("· Kedaluwarsa:")}{" "}{formatDateCompact(order.expires_at, undefined, lang)}</p>
          {Object.keys(order.metadata ?? {}).length > 0 && <pre className="mb-2 overflow-x-auto rounded bg-surface p-2 text-xs">{JSON.stringify(order.metadata, null, 2)}</pre>}
          <p className="mb-1 text-xs font-semibold">{t("Event pembayaran ({v1})", { v1: order.payment_events?.length ?? 0 })}</p>
          {(order.payment_events ?? []).map((e: any, i: number) => (
            <details key={i} className="mb-1 rounded bg-surface p-2 text-xs">
              <summary className="cursor-pointer">{formatDateCompact(e.received_at, undefined, lang)} {formatTime(e.received_at, undefined, undefined, lang)} · {e.transaction_status} · {e.payment_type ?? "-"}{" "}{t("· signature")}{" "}{e.signature_valid ? "valid" : t("TIDAK valid")}</summary>
              <pre className="mt-2 overflow-x-auto">{JSON.stringify(e.raw_payload, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
