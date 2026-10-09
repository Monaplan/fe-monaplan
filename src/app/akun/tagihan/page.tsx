import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { requireUser } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { StatusPill, type Tone } from "@/components/ui/pill";
import { formatDateCompact, formatIDR } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Tagihan") };
}

const STATUS: Record<string, [string, Tone]> = {
  paid: ["Lunas", "positive"], pending: ["Menunggu", "caution"], failed: ["Gagal", "danger"],
  expired: ["Kedaluwarsa", "neutral"], cancelled: ["Dibatalkan", "neutral"], refunded: ["Refund", "danger"],
};

export default async function BillingPage() {
  const { t, lang } = await getI18n();
  await requireUser();
  const supabase = await createClient();
  const { data: orders } = await supabase.from("orders").select("*, plans(name)").order("created_at", { ascending: false });

  return (
    <Card>
      <CardHeader title={t("Riwayat Order")} />
      {!orders?.length ? (
        <EmptyState icon={<ReceiptText />} title={t("Belum ada order")} text={t("Order pembayaran akan tampil di sini.")} />
      ) : (
        <ul className="divide-y divide-neutral-200">
          {orders.map((o: any) => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
              <div className="min-w-0 flex-1">
                <p className="tabular text-sm font-medium">{o.order_number}</p>
                <p className="text-xs text-neutral-500">{o.plans?.name} · {formatDateCompact(o.created_at, undefined, lang)}</p>
              </div>
              <span className="tabular text-sm font-semibold">{formatIDR(o.amount_idr)}</span>
              <StatusPill tone={STATUS[o.status]?.[1]}>{STATUS[o.status]?.[0] ?? o.status}</StatusPill>
              {o.status === "paid" && <Link href={`/akun/tagihan/${o.order_number}`} className="text-[13px] font-medium text-plum-600 hover:underline">{t("Kuitansi")}</Link>}
              {o.status === "pending" && o.provider_redirect_url && Date.parse(o.expires_at) > Date.now() && (
                <a href={o.provider_redirect_url} className="text-[13px] font-medium text-plum-600 hover:underline">{t("Lanjutkan bayar")}</a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
