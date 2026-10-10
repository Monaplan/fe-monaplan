import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { getI18n } from "@/i18n/server";
import type { Promo } from "@/lib/pricing";
import { PromoClient } from "./promo-client";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Promo") };
}

import { parseSort } from "@/lib/sort";
import { SortSelect } from "@/components/app/sort-select";

export default async function PromoPage({ searchParams }: { searchParams: Promise<{ sort?: string; dir?: string }> }) {
  await requireAdmin();
  const sort = parseSort(await searchParams, { tanggal: { column: "created_at", dir: "desc" }, nama: { column: "name", dir: "asc" }, diskon: { column: "discount_value", dir: "desc" } }, "tanggal");
  const { t } = await getI18n();
  const admin = createAdminClient();
  const settings = await getSettings();
  const [{ data: promos, error }, { data: plans }, { data: used }] = await Promise.all([
    admin.from("promos").select("*").order(sort.column, { ascending: sort.ascending }).order("created_at", { ascending: false }),
    admin.from("plans").select("id, name, price_idr, type, is_active").eq("type", "lifetime").eq("is_active", true).order("sort_order"),
    admin.from("orders").select("promo_id, status, expires_at").not("promo_id", "is", null).in("status", ["paid", "pending"]).limit(20000),
  ]);
  // Pemakaian: order lunas ditambah order pending yang belum kedaluwarsa (kuota sudah tercadangkan untuknya)
  const now = Date.now();
  const uses = new Map<string, number>();
  for (const o of used ?? []) {
    if (o.status === "paid" || (o.expires_at && Date.parse(o.expires_at as string) > now)) uses.set(o.promo_id as string, (uses.get(o.promo_id as string) ?? 0) + 1);
  }
  return (
    <PromoClient
      enabled={settings.promo.enabled}
      promos={((promos ?? []) as Promo[]).map((p) => ({ ...p, discount_value: Number(p.discount_value), uses: uses.get(p.id) ?? 0 }))}
      plans={(plans ?? []).map((p) => ({ id: p.id, name: p.name, price_idr: Number(p.price_idr) }))}
      migrated={!error}
      sortControl={<SortSelect value={sort.key} dir={sort.dir} options={[{ key: "tanggal", label: t("Tanggal") }, { key: "nama", label: t("Nama") }, { key: "diskon", label: t("Diskon") }]} />}
    />
  );
}
