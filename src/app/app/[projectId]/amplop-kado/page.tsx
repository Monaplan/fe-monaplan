import { CircleAlert } from "lucide-react";
import { withProjectData } from "@/lib/access";
import { getI18n } from "@/i18n/server";
import { ReceiptsClient } from "./receipts-client";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("Amplop & Kado") };
}

export default async function ReceiptsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { t } = await getI18n();
  const { projectId: ref } = await params;
  const [{ canWrite, projectId, project }, [receipts, guests]] = await withProjectData(ref, (pid, supabase) => Promise.all([
    supabase.from("gift_receipts").select("*").eq("project_id", pid).order("received_on", { ascending: false }).order("created_at", { ascending: false }).limit(3000),
    supabase.from("guests").select("id, name, side, phone_e164").eq("project_id", pid).order("name").limit(5000),
  ]));

  // Migrasi belum dijalankan: tampilkan petunjuk, bukan galat kosong
  if (receipts.error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Tabel Amplop & Kado belum ada. Jalankan migrasi 20261013000001_gift_receipts.sql di Supabase.")}
      </p>
    );
  }
  return <ReceiptsClient projectId={projectId} coupleName={project.title} tz={project.timezone} canWrite={canWrite} receipts={receipts.data ?? []} guests={guests.data ?? []} />;
}
