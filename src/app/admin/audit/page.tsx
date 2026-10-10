import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { formatDateCompact, formatTime } from "@/lib/format";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Log Audit") };
}

import { parseSort } from "@/lib/sort";
import { SortSelect } from "@/components/app/sort-select";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ sort?: string; dir?: string }> }) {
  const { t, lang } = await getI18n();
  await requireAdmin();
  const sort = parseSort(await searchParams, { tanggal: { column: "created_at", dir: "desc" }, aksi: { column: "action", dir: "asc" } }, "tanggal");
  const { data: logs } = await createAdminClient()
    .from("admin_audit_logs")
    .select("*, profiles(email)")
    .order(sort.column, { ascending: sort.ascending })
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <ProductTour id="admin-audit" steps={TOURS["admin-audit"]!} />
      <PageHeader tour="admin-audit" title={t("Log Audit")} description={t("Semua aksi admin tercatat di sini.")}
        actions={<SortSelect value={sort.key} dir={sort.dir} options={[{ key: "tanggal", label: t("Tanggal") }, { key: "aksi", label: t("Aksi") }]} />} />
      <Card tour="admin-audit-main" className="p-0 sm:p-0">
        {(logs ?? []).map((l: any) => (
          <details key={l.id} className="border-b border-neutral-200 px-5 py-3 last:border-0">
            <summary className="flex cursor-pointer flex-wrap gap-x-4 text-sm">
              <span className="tabular text-neutral-500">{formatDateCompact(l.created_at, undefined, lang)} {formatTime(l.created_at, undefined, undefined, lang)}</span>
              <span className="font-medium">{l.action}</span>
              <span className="text-neutral-600">{l.target_type}{l.target_id && ` · ${l.target_id.slice(0, 8)}`}</span>
              <span className="ml-auto text-neutral-500">{l.profiles?.email}</span>
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-neutral-50 p-2 text-xs">{JSON.stringify(l.metadata, null, 2)}</pre>
          </details>
        ))}
        {!logs?.length && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">{t("Belum ada log.")}</p>}
      </Card>
    </>
  );
}
