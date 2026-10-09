import { getProjectContext } from "@/lib/access";
import { ChecklistClient } from "./checklist-client";

export const metadata = { title: "To Do Checklist" };

export default async function ChecklistPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { supabase, project, members, canWrite } = await getProjectContext(projectId);
  const [{ data: tasks }, { data: vendors }] = await Promise.all([
    supabase.from("tasks").select("*").eq("project_id", projectId).order("sort_order").order("due_date", { nullsFirst: false }),
    supabase.from("vendors").select("id, name").eq("project_id", projectId).order("name"),
  ]);

  return (
    <ChecklistClient
      projectId={projectId}
      tz={project.timezone}
      tasks={tasks ?? []}
      vendors={vendors ?? []}
      members={members.map((m) => ({ id: m.user_id, name: m.profiles?.full_name ?? m.profiles?.email ?? "Anggota", avatar: m.profiles?.avatar_url ?? null }))}
      canWrite={canWrite}
      hasWeddingDate={!!project.wedding_date}
    />
  );
}
