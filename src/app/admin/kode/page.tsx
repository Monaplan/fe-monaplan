import Link from "next/link";
import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { formatDateCompact } from "@/lib/format";
import { NewBatchButton } from "./new-batch";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Kode Akses") };
}

export default async function CodesPage() {
  const { t, lang } = await getI18n();
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data: batches }, { data: plans }] = await Promise.all([
    admin.from("access_code_batches").select("*, plans(name), access_codes(redemption_count, status)").order("created_at", { ascending: false }),
    admin.from("plans").select("id, name").eq("is_active", true).eq("type", "lifetime").order("sort_order"),
  ]);

  return (
    <>
      <ProductTour id="admin-kode" steps={TOURS["admin-kode"]!} />
      <PageHeader tour="admin-kode" title={t("Kode Akses")} description={t("Buat batch kode untuk reseller, promo, atau kompensasi.")}
        actions={<NewBatchButton plans={plans ?? []} />} />
      <Card tour="admin-kode-main" className="p-0 sm:p-0">
        {(batches ?? []).length === 0 && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">{t("Belum ada batch.")}</p>}
        {(batches ?? []).map((b: any) => {
          const used = (b.access_codes ?? []).reduce((s: number, c: any) => s + c.redemption_count, 0);
          return (
            <Link key={b.id} href={`/admin/kode/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-neutral-200 px-5 py-3 last:border-0 hover:bg-plum-50">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-neutral-500">{t("{channel} · {plan} · dibuat {date}", { channel: b.channel, plan: b.plans?.name, date: formatDateCompact(b.created_at, undefined, lang) })}{b.valid_until && ` · ${t("berlaku sampai {date}", { date: formatDateCompact(b.valid_until, undefined, lang) })}`}</p>
              </div>
              <span className="tabular text-sm">{t("{used}/{v2} tertebus", { used, v2: b.quantity * b.max_redemptions_per_code })}</span>
              {b.revoked_at ? <StatusPill tone="danger">{t("Dicabut")}</StatusPill> : <StatusPill tone="positive">{t("Aktif")}</StatusPill>}
            </Link>
          );
        })}
      </Card>
    </>
  );
}
