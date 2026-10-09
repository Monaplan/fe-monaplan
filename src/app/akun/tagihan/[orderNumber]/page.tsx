import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatDateLong, formatIDR } from "@/lib/format";
import { PrintButton } from "./print-button";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Kuitansi") };
}

export default async function ReceiptPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { t, lang } = await getI18n();
  const { orderNumber } = await params;
  const { profile } = await requireUser();
  const supabase = await createClient();
  const { data: o } = await supabase.from("orders").select("*, plans(name, type)").eq("order_number", orderNumber).eq("status", "paid").maybeSingle();
  if (!o) notFound();
  const { data: lic } = await supabase.from("licenses").select("ends_at").eq("order_id", o.id).maybeSingle();

  const rows: [string, string][] = [
    ["Nomor order", o.order_number],
    ["Tanggal bayar", formatDateLong(o.paid_at, undefined, lang)],
    ["Nama", profile?.full_name ?? "-"],
    ["Email", profile?.email ?? "-"],
    ["Paket", (o as any).plans?.name ?? "-"],
    ["Metode bayar", o.payment_method ?? "-"],
    ["Masa aktif", lic?.ends_at ? `Sampai ${formatDateLong(lic.ends_at, undefined, lang)}` : "Selamanya"],
  ];
  // Rincian promo hanya ada pada order yang memakai promo
  const discount = Number(o.discount_idr ?? 0);
  if (discount > 0 && o.original_amount_idr) {
    rows.push(["Harga paket", formatIDR(o.original_amount_idr)]);
    rows.push([`Promo${o.promo_name ? ` ${o.promo_name}` : ""}`, `- ${formatIDR(discount)}`]);
  }

  return (
    <Card className="mx-auto max-w-lg">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="font-display text-2xl font-semibold text-plum-600">{t("Monaplan")}</p>
          <p className="text-[13px] text-neutral-500">{t("Kuitansi pembayaran")}</p>
        </div>
        <PrintButton />
      </div>
      <dl className="divide-y divide-neutral-200 text-sm">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-neutral-500">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
        <div className="flex justify-between py-3"><dt className="font-semibold">{t("Total")}</dt><dd className="tabular text-lg font-bold">{formatIDR(o.amount_idr)}</dd></div>
      </dl>
    </Card>
  );
}
