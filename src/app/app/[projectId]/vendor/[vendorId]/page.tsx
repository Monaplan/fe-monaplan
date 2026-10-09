import { notFound } from "next/navigation";
import { getProjectContext } from "@/lib/access";
import { VendorDetailClient } from "./vendor-detail-client";

export const metadata = { title: "Detail Vendor" };

export default async function VendorDetailPage({ params }: { params: Promise<{ projectId: string; vendorId: string }> }) {
  const { projectId, vendorId } = await params;
  const { supabase, project, canWrite } = await getProjectContext(projectId);
  const { data: vendor } = await supabase.from("vendors").select("*").eq("id", vendorId).eq("project_id", projectId).maybeSingle();
  if (!vendor) notFound();

  const [{ data: packages }, { data: payments }, { data: documents }, { data: tasks }, { data: categories }, { data: items }, { data: vendors }] = await Promise.all([
    supabase.from("vendor_packages").select("*").eq("vendor_id", vendorId).order("price_idr"),
    supabase.from("expense_payments").select("*").eq("vendor_id", vendorId).order("due_date", { nullsFirst: false }),
    supabase.from("documents").select("id, title, file_name, category, created_at").eq("vendor_id", vendorId).order("created_at", { ascending: false }),
    supabase.from("tasks").select("id, title, status, due_date").eq("vendor_id", vendorId).order("due_date", { nullsFirst: false }),
    supabase.from("budget_categories").select("id, name").eq("project_id", projectId).order("sort_order"),
    supabase.from("budget_items").select("id, name").eq("project_id", projectId),
    supabase.from("vendors").select("id, name").eq("project_id", projectId),
  ]);

  return (
    <VendorDetailClient
      projectId={projectId}
      tz={project.timezone}
      vendor={vendor}
      packages={packages ?? []}
      payments={payments ?? []}
      documents={documents ?? []}
      tasks={tasks ?? []}
      categories={categories ?? []}
      items={items ?? []}
      vendors={vendors ?? []}
      canWrite={canWrite}
    />
  );
}
