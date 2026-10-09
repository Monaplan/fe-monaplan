import { getProjectContext } from "@/lib/access";
import { getGoogleStatus } from "@/lib/google/status";
import { CalendarClient } from "./calendar-client";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Reminder & Calendar") };
}

export default async function CalendarPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ google?: string }> }) {
  const { projectId: ref } = await params;
  const { google } = await searchParams;
  const { supabase, project, canWrite, session, projectId } = await getProjectContext(ref);
  const [{ data: feed }, { data: agenda }, googleStatus] = await Promise.all([
    supabase.from("calendar_feed").select("*").eq("project_id", projectId).order("starts_at").limit(3000),
    supabase.from("agenda_items").select("*").eq("project_id", projectId),
    getGoogleStatus(session.user.id, projectId),
  ]);
  return <CalendarClient projectId={projectId} tz={project.timezone} feed={feed ?? []} agenda={agenda ?? []} canWrite={canWrite} google={googleStatus} googleFlash={google} />;
}
