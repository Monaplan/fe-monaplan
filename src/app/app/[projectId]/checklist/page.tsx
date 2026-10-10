import { withProjectData } from "@/lib/access";
import { ChecklistClient } from "./checklist-client";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("To Do Checklist") };
}

export default async function ChecklistPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: ref } = await params;
  const [{ project, members, canWrite, projectId }, [{ data: tasks }, { data: vendors }]] = await withProjectData(ref, (pid, supabase) => Promise.all([
    supabase.from("tasks").select("*").eq("project_id", pid).order("sort_order").order("due_date", { nullsFirst: false }),
    supabase.from("vendors").select("id, name").eq("project_id", pid).order("name"),
  ]));

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
