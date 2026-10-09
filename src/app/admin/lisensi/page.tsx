import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { GrantLicenseButton, LicenseRow } from "./license-client";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Lisensi") };
}

export default async function LicensesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { t } = await getI18n();
  await requireAdmin();
  const { q } = await searchParams;
  const admin = createAdminClient();
  let query = admin.from("licenses").select("*, plans(name, type), profiles!licenses_user_id_fkey(email, full_name)").order("created_at", { ascending: false }).limit(100);
  if (q) {
    const { data } = await admin.from("profiles").select("id").ilike("email", `%${q.replace(/[%_]/g, "")}%`).limit(50);
    query = query.in("user_id", (data ?? []).map((p) => p.id).concat("00000000-0000-0000-0000-000000000000"));
  }
  const [{ data: licenses }, { data: plans }] = await Promise.all([query, admin.from("plans").select("id, name").eq("type", "lifetime").eq("is_active", true).order("sort_order")]);

  return (
    <>
      <ProductTour id="admin-lisensi" steps={TOURS["admin-lisensi"]!} />
      <PageHeader tour="admin-lisensi" title={t("Lisensi")} actions={<GrantLicenseButton plans={plans ?? []} />} />
      <form className="mb-4"><Input name="q" defaultValue={q} placeholder={t("Cari email pengguna")} className="max-w-xs" /></form>
      <Card tour="admin-lisensi-main" className="p-0 sm:p-0">
        {(licenses ?? []).length === 0 && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">{t("Tidak ada lisensi.")}</p>}
        {(licenses ?? []).map((l: any) => <LicenseRow key={l.id} license={l} />)}
      </Card>
    </>
  );
}
