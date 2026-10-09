import { getProjectContext } from "@/lib/access";
import { BudgetClient } from "./budget-client";

export const metadata = { title: "Budgeting" };

export default async function BudgetPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { supabase, project, canWrite } = await getProjectContext(projectId);
  const [{ data: categories }, { data: items }, { data: payments }, { data: vendors }, { data: documents }] = await Promise.all([
    supabase.from("budget_categories").select("*").eq("project_id", projectId).order("sort_order").order("name"),
    supabase.from("budget_items").select("*, vendors(name)").eq("project_id", projectId).order("sort_order").order("created_at"),
    supabase.from("expense_payments").select("*, vendors(name), budget_items(name)").eq("project_id", projectId).order("due_date", { nullsFirst: false }),
    supabase.from("vendors").select("id, name").eq("project_id", projectId).order("name"),
    supabase.from("documents").select("id, title").eq("project_id", projectId).eq("category", "bukti_pembayaran"),
  ]);

  return (
    <BudgetClient
      projectId={projectId}
      tz={project.timezone}
      totalBudget={project.total_budget_idr}
      categories={categories ?? []}
      items={items ?? []}
      payments={payments ?? []}
      vendors={vendors ?? []}
      documents={documents ?? []}
      canWrite={canWrite}
    />
  );
}
