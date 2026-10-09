import { CalendarDays } from "lucide-react";
import { getProjectContext } from "@/lib/access";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { RundownClient } from "./rundown-client";

export const metadata = { title: "Rundown Hari H" };

export default async function RundownPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ acara?: string }> }) {
  const { projectId } = await params;
  const { acara } = await searchParams;
  const { supabase, project, canWrite } = await getProjectContext(projectId);
  // Acara, seluruh butir rundown, dan vendor diambil serentak; butir difilter per acara di memori
  const [{ data: events }, { data: allItems }, { data: vendors }] = await Promise.all([
    supabase.from("wedding_events").select("id, name, type, starts_at, venue_name").eq("project_id", projectId).order("sort_order").order("starts_at"),
    supabase.from("rundown_items").select("*, vendors(name)").eq("project_id", projectId).order("start_time").order("sort_order"),
    supabase.from("vendors").select("id, name").eq("project_id", projectId).order("name"),
  ]);

  if (!events?.length) {
    return (
      <>
        <PageHeader title="Rundown Hari H" />
        <Card>
          <EmptyState icon={<CalendarDays />} title="Belum ada acara" text="Tambahkan acara seperti akad atau resepsi di Pengaturan Pernikahan, lalu susun rundown-nya di sini."
            action={<ButtonLink href={`/w/${projectId}/pengaturan?tab=acara`}>Atur Acara</ButtonLink>} />
        </Card>
      </>
    );
  }

  const active = events.find((e) => e.id === acara) ?? events[0]!;
  const items = (allItems ?? []).filter((i) => i.event_id === active.id);

  return (
    <RundownClient
      projectId={projectId}
      tz={project.timezone}
      coupleName={project.title}
      events={events}
      active={active}
      items={items ?? []}
      vendors={vendors ?? []}
      canWrite={canWrite}
    />
  );
}
