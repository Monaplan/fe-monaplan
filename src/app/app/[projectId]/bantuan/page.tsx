import { getProjectContext } from "@/lib/access";
import { PageHeader } from "@/components/ui/card";
import { HelpCenter } from "@/components/app/help-center";
import { projectPath } from "@/lib/paths";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Pusat Bantuan") };
}

export default async function HelpPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { t } = await getI18n();
  const { projectId: ref } = await params;
  const { supabase, project, projectId, session } = await getProjectContext(ref);
  const { data: tickets } = await supabase.from("support_tickets").select("id, subject, status, created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(5);
  return (
    <>
      <PageHeader title={t("Pusat Bantuan")} />
      <HelpCenter base={projectPath(project)} projectId={projectId} tickets={tickets ?? []} />
    </>
  );
}
