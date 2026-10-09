import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlansClient } from "./plans-client";

export const metadata = { title: "Paket" };

export default async function PlansPage() {
  await requireAdmin();
  const { data } = await createAdminClient().from("plans").select("*").order("sort_order");
  return <PlansClient plans={data ?? []} />;
}
