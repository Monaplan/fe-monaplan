import Link from "next/link";
import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { formatDateCompact } from "@/lib/format";
import { NewBatchButton } from "./new-batch";

export const metadata = { title: "Kode Akses" };

export default async function CodesPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data: batches }, { data: plans }] = await Promise.all([
    admin.from("access_code_batches").select("*, plans(name), access_codes(redemption_count, status)").order("created_at", { ascending: false }),
    admin.from("plans").select("id, name").eq("is_active", true).eq("type", "lifetime").order("sort_order"),
  ]);

  return (
    <>
      <PageHeader title="Kode Akses" description="Buat batch kode untuk reseller, promo, bonus vendor, penjualan offline, atau kompensasi."
        actions={<NewBatchButton plans={plans ?? []} />} />
      <Card className="p-0 sm:p-0">
        {(batches ?? []).length === 0 && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">Belum ada batch.</p>}
        {(batches ?? []).map((b: any) => {
          const used = (b.access_codes ?? []).reduce((s: number, c: any) => s + c.redemption_count, 0);
          return (
            <Link key={b.id} href={`/admin/kode/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-neutral-200 px-5 py-3 last:border-0 hover:bg-plum-50">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-neutral-500">{b.channel} · {b.plans?.name} · dibuat {formatDateCompact(b.created_at)}{b.valid_until && ` · berlaku sampai ${formatDateCompact(b.valid_until)}`}</p>
              </div>
              <span className="tabular text-sm">{used}/{b.quantity * b.max_redemptions_per_code} tertebus</span>
              {b.revoked_at ? <StatusPill tone="danger">Dicabut</StatusPill> : <StatusPill tone="positive">Aktif</StatusPill>}
            </Link>
          );
        })}
      </Card>
    </>
  );
}
