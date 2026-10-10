import { getMyProjects, requireUser } from "@/lib/access";
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
  await requireUser();
  const projects = await getMyProjects();
  const first = projects.find((p) => !p.archived_at);
  return (
    <>
      <PageHeader title={t("Pusat Bantuan")} />
      <HelpCenter base={first ? projectPath(first) : null} />
    </>
  );
}
