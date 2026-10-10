import { CircleAlert } from "lucide-react";
import { withProjectData } from "@/lib/access";
import { getI18n } from "@/i18n/server";
import { TripClient } from "./trip-client";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("Honeymoon Planner") };
}

export default async function TripPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { t } = await getI18n();
  const { projectId: ref } = await params;
  const [{ canWrite, projectId, project }, [plan, items]] = await withProjectData(ref, (pid, supabase) => Promise.all([
    supabase.from("trip_plans").select("*").eq("project_id", pid).maybeSingle(),
    supabase.from("trip_items").select("*").eq("project_id", pid).order("day_date", { ascending: true, nullsFirst: false }).order("start_time", { ascending: true, nullsFirst: false }).order("created_at"),
  ]));

  // Migrasi 8 belum dijalankan: tampilkan petunjuk, bukan galat kosong
  if (plan.error || items.error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Tabel Honeymoon Planner belum ada. Jalankan migrasi 20261009000008_inspiration_trip.sql di Supabase.")}
      </p>
    );
  }
  return <TripClient projectId={projectId} canWrite={canWrite} weddingDate={project.wedding_date} plan={plan.data} items={items.data ?? []} />;
}
