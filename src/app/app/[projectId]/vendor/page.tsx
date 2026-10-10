import { withProjectData } from "@/lib/access";
import { VendorListClient } from "./vendor-list-client";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Kelola Vendor") };
}

export default async function VendorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: ref } = await params;
  const [{ canWrite, projectId }, [{ data: vendors }, { data: packages }, { data: categories }]] = await withProjectData(ref, (pid, supabase) => Promise.all([
    supabase.from("vendors").select("*").eq("project_id", pid).order("created_at", { ascending: false }),
    supabase.from("vendor_packages").select("*").eq("project_id", pid).order("price_idr"),
    supabase.from("budget_categories").select("id, name").eq("project_id", pid).order("sort_order"),
  ]));
  return <VendorListClient projectId={projectId} vendors={vendors ?? []} packages={packages ?? []} categories={categories ?? []} canWrite={canWrite} />;
}
