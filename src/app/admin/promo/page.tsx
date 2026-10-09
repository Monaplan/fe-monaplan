import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import type { Promo } from "@/lib/pricing";
import { PromoClient } from "./promo-client";

export const metadata = { title: "Promo" };

export default async function PromoPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const settings = await getSettings();
  const [{ data: promos, error }, { data: plans }] = await Promise.all([
    admin.from("promos").select("*").order("created_at", { ascending: false }),
    admin.from("plans").select("id, name, price_idr, type, is_active").eq("type", "lifetime").eq("is_active", true).order("sort_order"),
  ]);
  return (
    <PromoClient
      enabled={settings.promo.enabled}
      promos={((promos ?? []) as Promo[]).map((p) => ({ ...p, discount_value: Number(p.discount_value) }))}
      plans={(plans ?? []).map((p) => ({ id: p.id, name: p.name, price_idr: Number(p.price_idr) }))}
      migrated={!error}
    />
  );
}
