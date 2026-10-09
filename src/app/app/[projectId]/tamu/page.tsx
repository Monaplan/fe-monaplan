import { getProjectContext } from "@/lib/access";
import { appUrl, DEFAULT_TEMPLATE } from "@/lib/constants";
import { GuestsClient } from "./guests-client";

export const metadata = { title: "Tamu & RSVP" };

export default async function GuestsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { supabase, project, canWrite } = await getProjectContext(projectId);
  const [{ data: guests }, { data: groups }, { data: events }, { data: invites }, { data: templates }] = await Promise.all([
    supabase.from("guests").select("*").eq("project_id", projectId).order("created_at", { ascending: true }).limit(5000),
    supabase.from("guest_groups").select("id, name, side").eq("project_id", projectId).order("name"),
    supabase.from("wedding_events").select("id, name, starts_at, ends_at, venue_name, venue_address, maps_url").eq("project_id", projectId).order("sort_order").order("starts_at"),
    supabase.from("guest_event_invites").select("guest_id, event_id").eq("project_id", projectId).limit(20000),
    supabase.from("message_templates").select("*").eq("project_id", projectId).order("is_default", { ascending: false }).limit(1),
  ]);

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
      canWrite={canWrite}
    />
  );
}
