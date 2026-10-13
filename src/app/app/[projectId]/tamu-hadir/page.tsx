import { CircleAlert } from "lucide-react";
import { withProjectData } from "@/lib/access";
import { getI18n } from "@/i18n/server";
import { listArrivedGuests } from "@/lib/checkin";
import { ArrivedClient } from "./arrived-client";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("Tamu Hadir") };
}

export default async function ArrivedPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { t } = await getI18n();
  const { projectId: ref } = await params;
  const [{ project, projectId, canWrite }, [arrived, expected]] = await withProjectData(ref, async (pid, supabase) => Promise.all([
    listArrivedGuests(supabase, pid),
    // Pembanding: tamu yang konfirmasi hadir dan jumlah orangnya
    supabase.from("guests").select("pax_confirmed").eq("project_id", pid).eq("rsvp_status", "hadir").limit(5000),
  ]));

  // Migrasi check-in belum dijalankan: tampilkan petunjuk, bukan galat kosong
  if (arrived === null) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Fitur check-in belum aktif. Jalankan migrasi 20261013000006_guest_checkin.sql di Supabase.")}
      </p>
    );
  }
  const rows = (expected.data ?? []) as { pax_confirmed: number }[];
  return (
    <ArrivedClient projectId={projectId} tz={project.timezone} canWrite={canWrite} guests={arrived}
      expectedGuests={rows.length} expectedPax={rows.reduce((s, r) => s + (r.pax_confirmed ?? 0), 0)} />
  );
}
