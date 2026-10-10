import { CalendarDays } from "lucide-react";
import { withProjectData } from "@/lib/access";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { RundownClient } from "./rundown-client";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Rundown Hari H") };
}

export default async function RundownPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ acara?: string }> }) {
  const { t } = await getI18n();
  const { projectId: ref } = await params;
  const { acara } = await searchParams;
  // Acara, seluruh butir rundown, dan vendor diambil serentak dengan konteks; butir difilter per acara di memori
  const [{ project, canWrite, projectId }, [{ data: events }, { data: allItems }, { data: vendors }]] = await withProjectData(ref, (pid, supabase) => Promise.all([
    supabase.from("wedding_events").select("id, name, type, starts_at, venue_name").eq("project_id", pid).order("sort_order").order("starts_at"),
    supabase.from("rundown_items").select("*, vendors(name)").eq("project_id", pid).order("start_time").order("sort_order"),
    supabase.from("vendors").select("id, name").eq("project_id", pid).order("name"),
  ]));

  if (!events?.length) {
    return (
      <>
        <PageHeader title={t("Rundown Hari H")} />
        <Card>
          <EmptyState icon={<CalendarDays />} title={t("Belum ada acara")} text={t("Tambahkan acara di Pengaturan Pernikahan dulu.")}
            action={<ButtonLink href={`/app/${ref}/pengaturan?tab=acara`}>{t("Atur Acara")}</ButtonLink>} />
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
