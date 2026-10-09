import Link from "next/link";
import { BadgeCheck, KeyRound, ReceiptText, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { formatIDR } from "@/lib/format";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { getI18n } from "@/i18n/server";

export default async function AdminHome() {
  const { t } = await getI18n();
  await requireAdmin();
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const [{ data: paid }, { data: orders }, { count: activeLic }, { data: batches }, { count: review }] = await Promise.all([
    admin.from("orders").select("amount_idr, paid_at").eq("status", "paid"),
    admin.from("orders").select("status"),
    admin.from("licenses").select("*", { count: "exact", head: true }).eq("status", "active").lte("starts_at", nowIso).or(`ends_at.is.null,ends_at.gt.${nowIso}`),
    admin.from("access_code_batches").select("id, name, channel, quantity, plans(name), access_codes(redemption_count)").order("created_at", { ascending: false }).limit(10),
    admin.from("orders").select("*", { count: "exact", head: true }).eq("needs_review", true),
  ]);

  const revenue = (paid ?? []).reduce((s, o) => s + Number(o.amount_idr), 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const revenueMonth = (paid ?? []).filter((o) => o.paid_at && o.paid_at >= monthStart).reduce((s, o) => s + Number(o.amount_idr), 0);
  const byStatus = (orders ?? []).reduce<Record<string, number>>((m, o) => ({ ...m, [o.status]: (m[o.status] ?? 0) + 1 }), {});

  return (
    <>
      <ProductTour id="admin" steps={TOURS["admin"]!} />
      <PageHeader tour="admin" title={t("Ringkasan")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Wallet />} title={t("Pendapatan")} value={formatIDR(revenue)} footer={<>{t("Bulan ini {v1}", { v1: formatIDR(revenueMonth) })}</>} />
        <StatCard icon={<ReceiptText />} title={t("Order Lunas")} value={byStatus.paid ?? 0} footer={<>{t("{v1} menunggu · {v2} kedaluwarsa", { v1: byStatus.pending ?? 0, v2: byStatus.expired ?? 0 })}</>} />
        <StatCard icon={<BadgeCheck />} title={t("Lisensi Aktif")} value={activeLic ?? 0} />
        <StatCard icon={<KeyRound />} title={t("Perlu Ditinjau")} value={review ?? 0} footer={<Link className="text-plum-600 underline" href="/admin/order?review=1">{t("Lihat order")}</Link>} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card tour="admin-main">
          <CardHeader title={t("Order per Status")} />
          <ul className="space-y-2 text-sm">
            {Object.entries(byStatus).map(([k, v]) => <li key={k} className="flex justify-between"><span>{t(({paid:"Lunas",pending:"Menunggu",failed:"Gagal",expired:"Kedaluwarsa",cancelled:"Dibatalkan",refunded:"Refund"} as Record<string,string>)[k] ?? k)}</span><span className="tabular font-semibold">{v}</span></li>)}
            {!orders?.length && <li className="text-neutral-500">{t("Belum ada order.")}</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader title={t("Kode Tertebus per Batch")} />
          <ul className="space-y-3">
            {(batches ?? []).map((b: any) => {
              const used = (b.access_codes ?? []).reduce((s: number, c: any) => s + c.redemption_count, 0);
              return (
                <li key={b.id}>
                  <div className="mb-1 flex justify-between text-sm"><Link href={`/admin/kode/${b.id}`} className="font-medium hover:text-plum-700">{b.name}</Link><span className="tabular text-neutral-600">{used}/{b.quantity}</span></div>
                  <ProgressBar value={b.quantity ? used / b.quantity : 0} />
                </li>
              );
            })}
            {!batches?.length && <li className="text-sm text-neutral-500">{t("Belum ada batch.")}</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
