import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { OrderRow } from "./order-row";
import { parseSort } from "@/lib/sort";
import { SortSelect } from "@/components/app/sort-select";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Order") };
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; review?: string; sort?: string; dir?: string }> }) {
  const { t } = await getI18n();
  await requireAdmin();
  const sp = await searchParams;
  const { q, status, review } = sp;
  const sort = parseSort(sp, { tanggal: { column: "created_at", dir: "desc" }, nominal: { column: "amount_idr", dir: "desc" }, status: { column: "status", dir: "asc" } }, "tanggal");
  const admin = createAdminClient();

  let userIds: string[] | null = null;
  if (q && q.includes("@")) {
    const { data } = await admin.from("profiles").select("id").ilike("email", `%${q.replace(/[%_]/g, "")}%`).limit(50);
    userIds = (data ?? []).map((p) => p.id);
  }
  let query = admin.from("orders").select("*, plans(name), profiles(email), payment_events(transaction_status, payment_type, signature_valid, received_at, raw_payload)")
    .order(sort.column, { ascending: sort.ascending }).order("created_at", { ascending: false }).limit(100);
  if (status) query = query.eq("status", status);
  if (review) query = query.eq("needs_review", true);
  if (userIds) query = query.in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  else if (q) query = query.ilike("order_number", `%${q.replace(/[%_]/g, "")}%`);
  const { data: orders } = await query;

  return (
    <>
      <ProductTour id="admin-order" steps={TOURS["admin-order"]!} />
      <PageHeader tour="admin-order" title={t("Order")} />
      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder={t("Nomor order atau email")} className="max-w-xs" />
        <Select name="status" defaultValue={status ?? ""} className="w-auto">
          <option value="">{t("Semua status")}</option>
          {["pending", "paid", "failed", "expired", "cancelled", "refunded"].map((s) => <option key={s}>{s}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="review" value="1" defaultChecked={!!review} className="accent-plum-600" />{t("Perlu ditinjau")}</label>
        <Button type="submit" variant="secondary">{t("Terapkan")}</Button>
        {sp.sort && <input type="hidden" name="sort" value={sort.key} />}
        {sp.dir && <input type="hidden" name="dir" value={sort.dir} />}
        <div className="ml-auto"><SortSelect value={sort.key} dir={sort.dir} options={[{ key: "tanggal", label: t("Tanggal") }, { key: "nominal", label: t("Nominal") }, { key: "status", label: t("Status") }]} /></div>
      </form>
      <Card tour="admin-order-main" className="p-0 sm:p-0">
        {(orders ?? []).length === 0 && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">{t("Tidak ada order.")}</p>}
        {(orders ?? []).map((o: any) => <OrderRow key={o.id} order={o} />)}
      </Card>
    </>
  );
}
