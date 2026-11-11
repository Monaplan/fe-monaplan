import { CircleAlert, KeyRound, ShoppingBag, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatCard } from "@/components/ui/card";
import { formatIDR } from "@/lib/format";
import { appUrl } from "@/lib/constants";
import { getI18n, getT } from "@/i18n/server";
import { BuyersClient, type SaleItem } from "./buyers-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Pembeli") };
}

export default async function BuyersPage() {
  const { t } = await getI18n();
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data, error }, { data: plans }] = await Promise.all([
    admin.from("sales")
      .select("*, plans(name), access_codes(code, status, access_code_redemptions(redeemed_at, profiles(email)))")
      .order("sold_on", { ascending: false }).order("created_at", { ascending: false }).limit(1000),
    admin.from("plans").select("id, name, price_idr").eq("type", "lifetime").eq("is_active", true).order("sort_order"),
  ]);
  // 42P01 = tabel belum ada: migrasi keuangan belum dijalankan
  const missing = error?.code === "42P01" || /relation .*sales/i.test(error?.message ?? "");

  const sales: SaleItem[] = (data ?? []).map((s: any) => {
    const redemption = s.access_codes?.access_code_redemptions?.[0];
    return {
      id: s.id, sold_on: s.sold_on, buyer_name: s.buyer_name, buyer_email: s.buyer_email, buyer_phone: s.buyer_phone,
      channel: s.channel, plan_id: s.plan_id, plan_name: s.plans?.name ?? null, gross_idr: Number(s.gross_idr), fee_idr: Number(s.fee_idr),
      status: s.status, reference: s.reference, notes: s.notes,
      code: s.access_codes?.code ?? null, code_status: s.access_codes?.status ?? null,
      redeemer: redemption?.profiles?.email ?? null, redeemed_at: redemption?.redeemed_at ?? null,
    };
  });
  const paid = sales.filter((s) => s.status === "paid");
  const gross = paid.reduce((n, s) => n + s.gross_idr, 0);
  const waiting = paid.filter((s) => s.code_status === "available").length;

  return (
    <>
      <PageHeader title={t("Pembeli")} description={t("Catat pembeli dari Lynk.id, WhatsApp, atau offline. Setiap catatan otomatis masuk ke Keuangan.")} />

      {missing && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Tabel keuangan belum ada di database. Jalankan migrasi 20261111000001_sales_finance.sql di Supabase SQL Editor, lalu muat ulang halaman ini.")}
        </p>
      )}

      <div className="stagger mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<ShoppingBag />} title={t("Pembeli tercatat")} value={paid.length} footer={<span>{t("{n} di-refund", { n: sales.length - paid.length })}</span>} />
        <StatCard icon={<Wallet />} title={t("Total pembayaran")} value={formatIDR(gross)} footer={<span>{t("Semua saluran manual")}</span>} />
        <StatCard icon={<KeyRound />} title={t("Kode belum diaktifkan")} value={waiting} footer={<span>{t("Sudah dikirim, belum dipakai pembeli")}</span>} />
      </div>

      <BuyersClient sales={sales} plans={(plans ?? []).map((p: any) => ({ id: p.id, name: p.name, price_idr: Number(p.price_idr) }))} appUrl={appUrl()} disabled={missing} />
    </>
  );
}
