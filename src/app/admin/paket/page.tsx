import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlansClient } from "./plans-client";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Paket") };
}

export default async function PlansPage() {
  await requireAdmin();
  const { data } = await createAdminClient().from("plans").select("*").order("sort_order");
  return <PlansClient plans={data ?? []} />;
}
