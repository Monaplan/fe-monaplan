import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlansClient } from "./plans-client";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Paket") };
}

import { parseSort } from "@/lib/sort";
import { SortSelect } from "@/components/app/sort-select";
import { getI18n } from "@/i18n/server";

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ sort?: string; dir?: string }> }) {
  await requireAdmin();
  const { t } = await getI18n();
  const sort = parseSort(await searchParams, { urutan: { column: "sort_order", dir: "asc" }, harga: { column: "price_idr", dir: "desc" }, nama: { column: "name", dir: "asc" } }, "urutan");
  const { data } = await createAdminClient().from("plans").select("*").order(sort.column, { ascending: sort.ascending }).order("sort_order");
  return <PlansClient plans={data ?? []} sortControl={<SortSelect value={sort.key} dir={sort.dir} options={[{ key: "urutan", label: t("Urutan tampil") }, { key: "harga", label: t("Harga") }, { key: "nama", label: t("Nama") }]} />} />;
}
