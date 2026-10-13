import { withProjectData } from "@/lib/access";
import { loadDayData } from "@/lib/hari-h";
import { getI18n } from "@/i18n/server";
import { HariHClient } from "./hari-h-client";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("Mode Hari H") };
}

export default async function HariHPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: ref } = await params;
  // Data hari H diambil bersamaan dengan konteks proyek; judul dan tanggal dilengkapi dari konteks
  const [{ project, projectId, canWrite }, day] = await withProjectData(ref, (pid, supabase, timezone) =>
    loadDayData(supabase, { id: pid, title: "", timezone, wedding_date: null }));
  const data = { ...day, title: project.title, tz: project.timezone, weddingDate: project.wedding_date };
  return <HariHClient projectId={projectId} data={data} canWrite={canWrite} />;
}
