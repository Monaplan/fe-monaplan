import { withProjectData } from "@/lib/access";
import { appUrl, DEFAULT_TEMPLATE } from "@/lib/constants";
import { GuestsClient } from "./guests-client";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Tamu & RSVP") };
}

export default async function GuestsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: ref } = await params;
  const [{ project, canWrite, projectId }, [{ data: guests }, { data: groups }, { data: events }, { data: invites }, { data: templates }]] = await withProjectData(ref, (pid, supabase) => Promise.all([
    supabase.from("guests").select("*").eq("project_id", pid).order("created_at", { ascending: true }).limit(5000),
    supabase.from("guest_groups").select("id, name, side").eq("project_id", pid).order("name"),
    supabase.from("wedding_events").select("id, name, starts_at, ends_at, venue_name, venue_address, maps_url").eq("project_id", pid).order("sort_order").order("starts_at"),
    supabase.from("guest_event_invites").select("guest_id, event_id").eq("project_id", pid).limit(20000),
    supabase.from("message_templates").select("*").eq("project_id", pid).order("is_default", { ascending: false }).limit(1),
  ]));

  return (
    <GuestsClient
      projectId={projectId}
      tz={project.timezone}
      coupleName={project.title}
      rsvpDeadline={project.rsvp_deadline}
      guests={guests ?? []}
      groups={groups ?? []}
      events={events ?? []}
      invites={invites ?? []}
      template={templates?.[0] ?? { id: null, name: "Undangan standar", body: DEFAULT_TEMPLATE }}
      baseUrl={appUrl()}
      slug={project.slug ?? project.id}
      canWrite={canWrite}
    />
  );
}
