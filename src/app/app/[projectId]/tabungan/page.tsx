import { CircleAlert } from "lucide-react";
import { withProjectData } from "@/lib/access";
import { getI18n } from "@/i18n/server";
import { todayISO } from "@/lib/format";
import { SavingsClient } from "./savings-client";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("Tabungan") };
}

export default async function SavingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { t } = await getI18n();
  const { projectId: ref } = await params;
  const [{ project, projectId, canWrite }, [deposits, items, payments]] = await withProjectData(ref, (pid, supabase) => Promise.all([
    supabase.from("savings_deposits").select("id, amount_idr, deposited_on, note, created_at").eq("project_id", pid).order("deposited_on", { ascending: false }).order("created_at", { ascending: false }).limit(3000),
    supabase.from("budget_items").select("id, estimated_idr, actual_idr").eq("project_id", pid),
    supabase.from("expense_payments").select("budget_item_id, amount_idr, status").eq("project_id", pid),
  ]));

  // Migrasi belum dijalankan: tampilkan petunjuk, bukan galat kosong
  if (deposits.error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Tabel Tabungan belum ada. Jalankan migrasi 20261013000007_savings_deposits.sql di Supabase.")}
      </p>
    );
  }
  return (
    <SavingsClient projectId={projectId} tz={project.timezone} weddingDate={project.wedding_date} today={todayISO(project.timezone)}
      canWrite={canWrite} deposits={deposits.data ?? []} items={items.data ?? []} payments={payments.data ?? []}
      target={project.savings_target_idr ?? null} deadline={project.savings_deadline ?? null} targetSupported={project.savings_target_idr !== undefined} />
  );
}
