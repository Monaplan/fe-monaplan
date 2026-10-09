import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { formatDateCompact } from "@/lib/format";
import { BatchCodes, RevokeBatchButton } from "./batch-codes";

export const metadata = { title: "Detail Batch" };

export default async function BatchPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  await requireAdmin();
  const admin = createAdminClient();
  const { data: batch } = await admin.from("access_code_batches").select("*, plans(name)").eq("id", batchId).maybeSingle();
  if (!batch) notFound();
  const { data: codes } = await admin
    .from("access_codes")
    .select("id, code, status, redemption_count, max_redemptions, valid_until, revoked_reason, access_code_redemptions(redeemed_at, license_id, profiles(email))")
    .eq("batch_id", batchId)
    .order("created_at")
    .limit(10000);

  return (
    <>
      <Link href="/admin/kode" className="mb-3 inline-flex items-center gap-1 text-[13px] text-neutral-600 hover:text-plum-700"><ArrowLeft className="size-4" />Semua batch</Link>
      <PageHeader
        title={batch.name}
        description={`${batch.channel} · ${(batch as any).plans?.name} · ${batch.quantity} kode · dibuat ${formatDateCompact(batch.created_at)}${batch.valid_until ? ` · berlaku sampai ${formatDateCompact(batch.valid_until)}` : ""}`}
        actions={
          <>
            <ButtonLink href={`/api/admin/batches/${batchId}/csv`} prefetch={false} variant="outline" icon={<Download />}>Ekspor CSV</ButtonLink>
            {!batch.revoked_at && <RevokeBatchButton batchId={batchId} />}
          </>
        }
      />
      <Card className="p-0 sm:p-0">
        <BatchCodes codes={(codes ?? []) as any} />
      </Card>
    </>
  );
}
