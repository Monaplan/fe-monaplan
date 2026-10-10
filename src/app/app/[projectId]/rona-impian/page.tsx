import { CircleAlert } from "lucide-react";
import { withProjectData } from "@/lib/access";
import { getDownloadUrls } from "@/lib/storage";
import { getI18n } from "@/i18n/server";
import { InspirationClient } from "./inspiration-client";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("Rona Impian") };
}

export default async function InspirationPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { t } = await getI18n();
  const { projectId: ref } = await params;
  const [{ canWrite, projectId }, { data, error }] = await withProjectData(ref, async (pid, supabase) => await supabase.from("inspiration_items").select("*").eq("project_id", pid).order("is_favorite", { ascending: false }).order("created_at", { ascending: false }));

  // Migrasi 8 belum dijalankan: tampilkan petunjuk, bukan galat kosong
  if (error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Tabel Rona Impian belum ada. Jalankan migrasi 20261009000008_inspiration_trip.sql di Supabase.")}
      </p>
    );
  }

  const paths = (data ?? []).map((i) => i.image_path).filter(Boolean) as string[];
  const urls = paths.length ? await getDownloadUrls(paths, 3600) : {};
  return <InspirationClient projectId={projectId} canWrite={canWrite} items={(data ?? []).map((i) => ({ ...i, image_url: i.image_path ? urls[i.image_path] ?? null : null }))} />;
}
