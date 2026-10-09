import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { formatDateCompact, formatTime } from "@/lib/format";

export const metadata = { title: "Log Audit" };

export default async function AuditPage() {
  await requireAdmin();
  const { data: logs } = await createAdminClient()
    .from("admin_audit_logs")
    .select("*, profiles(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader title="Log Audit" description="Semua aksi admin tercatat di sini." />
      <Card className="p-0 sm:p-0">
        {(logs ?? []).map((l: any) => (
          <details key={l.id} className="border-b border-neutral-200 px-5 py-3 last:border-0">
            <summary className="flex cursor-pointer flex-wrap gap-x-4 text-sm">
              <span className="tabular text-neutral-500">{formatDateCompact(l.created_at)} {formatTime(l.created_at)}</span>
              <span className="font-medium">{l.action}</span>
              <span className="text-neutral-600">{l.target_type}{l.target_id && ` · ${l.target_id.slice(0, 8)}`}</span>
              <span className="ml-auto text-neutral-500">{l.profiles?.email}</span>
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-neutral-50 p-2 text-xs">{JSON.stringify(l.metadata, null, 2)}</pre>
          </details>
        ))}
        {!logs?.length && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">Belum ada log.</p>}
      </Card>
    </>
  );
}
