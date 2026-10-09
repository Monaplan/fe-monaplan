import { getProjectContext } from "@/lib/access";
import { VendorListClient } from "./vendor-list-client";

export const metadata = { title: "Kelola Vendor" };

export default async function VendorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { supabase, canWrite } = await getProjectContext(projectId);
  const [{ data: vendors }, { data: packages }, { data: categories }] = await Promise.all([
    supabase.from("vendors").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("vendor_packages").select("*").eq("project_id", projectId).order("price_idr"),
    supabase.from("budget_categories").select("id, name").eq("project_id", projectId).order("sort_order"),
  ]);
  return <VendorListClient projectId={projectId} vendors={vendors ?? []} packages={packages ?? []} categories={categories ?? []} canWrite={canWrite} />;
}
