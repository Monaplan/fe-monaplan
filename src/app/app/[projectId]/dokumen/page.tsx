import { withProjectData } from "@/lib/access";
import { getStorageUsage } from "@/features/documents/actions";
import { DocumentsClient } from "./documents-client";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Dokumen Penting") };
}

export default async function DocumentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: ref } = await params;
  const [{ canWrite, projectId }, [{ data: checklist }, { data: documents }, { data: vendors }, usage]] = await withProjectData(ref, (pid, supabase) => Promise.all([
    supabase.from("document_checklist_items").select("*").eq("project_id", pid).order("sort_order").order("created_at"),
    supabase.from("documents").select("*, vendors(name)").eq("project_id", pid).order("created_at", { ascending: false }),
    supabase.from("vendors").select("id, name").eq("project_id", pid).order("name"),
    getStorageUsage(pid),
  ]));
  return <DocumentsClient projectId={projectId} checklist={checklist ?? []} documents={documents ?? []} vendors={vendors ?? []} usage={usage} canWrite={canWrite} />;
}
