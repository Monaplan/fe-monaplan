import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { parseSort } from "@/lib/sort";
import { SortSelect } from "@/components/app/sort-select";
import { LinkTabs } from "@/components/ui/tabs";
import { GrantLicenseButton, LicenseRow } from "./license-client";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Lisensi") };
}

export default async function LicensesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; sort?: string; dir?: string }> }) {
  const { t } = await getI18n();
  await requireAdmin();
  const sp = await searchParams;
  const { q, status } = sp;
  const sort = parseSort(sp, { tanggal: { column: "created_at", dir: "desc" }, berakhir: { column: "ends_at", dir: "asc" }, status: { column: "status", dir: "asc" } }, "tanggal");
  const onlyRevoked = status === "dicabut";
  const admin = createAdminClient();
  let query = admin.from("licenses").select("*, plans(name, type), profiles!licenses_user_id_fkey(email, full_name)").order(sort.column, { ascending: sort.ascending, nullsFirst: false }).order("created_at", { ascending: false }).limit(100);
  if (onlyRevoked) query = query.eq("status", "revoked");
  if (q) {
    const { data } = await admin.from("profiles").select("id").ilike("email", `%${q.replace(/[%_]/g, "")}%`).limit(50);
    query = query.in("user_id", (data ?? []).map((p) => p.id).concat("00000000-0000-0000-0000-000000000000"));
  }
  const [{ data: licenses }, { data: plans }] = await Promise.all([query, admin.from("plans").select("id, name").eq("type", "lifetime").eq("is_active", true).order("sort_order")]);

  return (
    <>
      <ProductTour id="admin-lisensi" steps={TOURS["admin-lisensi"]!} />
      <PageHeader tour="admin-lisensi" title={t("Lisensi")} actions={<GrantLicenseButton plans={plans ?? []} />} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <LinkTabs items={[
          { href: q ? `/admin/lisensi?q=${encodeURIComponent(q)}` : "/admin/lisensi", label: t("Semua"), active: !onlyRevoked },
          { href: `/admin/lisensi?status=dicabut${q ? `&q=${encodeURIComponent(q)}` : ""}`, label: t("Dicabut"), active: onlyRevoked },
        ]} />
        <form className="flex-1"><input type="hidden" name="status" value={onlyRevoked ? "dicabut" : ""} />{sp.sort && <input type="hidden" name="sort" value={sort.key} />}{sp.dir && <input type="hidden" name="dir" value={sort.dir} />}<Input name="q" defaultValue={q} placeholder={t("Cari email pengguna")} className="max-w-xs" /></form>
        <SortSelect value={sort.key} dir={sort.dir} options={[{ key: "tanggal", label: t("Tanggal") }, { key: "berakhir", label: t("Berakhir") }, { key: "status", label: t("Status") }]} />
      </div>
      <Card tour="admin-lisensi-main" className="p-0 sm:p-0">
        {(licenses ?? []).length === 0 && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">{t("Tidak ada lisensi.")}</p>}
        {(licenses ?? []).map((l: any) => <LicenseRow key={l.id} license={l} />)}
      </Card>
    </>
  );
}
