import { getMyProjects, requireUser } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { HelpCenter } from "@/components/app/help-center";
import { projectPath } from "@/lib/paths";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Pusat Bantuan") };
}

export default async function AccountHelpPage() {
  const { t } = await getI18n();
  const { user, profile } = await requireUser();
  const supabase = await createClient();
  const [projects, { data: tickets }] = await Promise.all([
    getMyProjects(),
    supabase.from("support_tickets").select("id, subject, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);
  const first = projects.find((p) => !p.archived_at);
  return (
    <>
      <PageHeader title={t("Pusat Bantuan")} />
      <HelpCenter base={first ? projectPath(first) : null} projectId={first?.id ?? null} tickets={tickets ?? []} />
    </>
  );
}
