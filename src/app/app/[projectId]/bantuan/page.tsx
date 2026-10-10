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
  const { project } = await getProjectContext(ref);
  return (
    <>
      <PageHeader title={t("Pusat Bantuan")} />
      <HelpCenter base={projectPath(project)} />
    </>
  );
}
