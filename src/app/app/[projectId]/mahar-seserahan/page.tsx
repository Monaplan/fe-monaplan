import { getProjectContext } from "@/lib/access";
import { GiftsClient } from "./gifts-client";
import { getDownloadUrls } from "@/lib/storage";

export const metadata = { title: "Mahar & Seserahan" };

export default async function GiftsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { supabase, canWrite } = await getProjectContext(projectId);
  const { data: items } = await supabase.from("gift_items").select("*").eq("project_id", projectId).order("sort_order").order("created_at");

  const paths = (items ?? []).map((i) => i.image_path).filter(Boolean) as string[];
  const urls = paths.length ? await getDownloadUrls(paths, 3600) : {};

  return <GiftsClient projectId={projectId} items={(items ?? []).map((i) => ({ ...i, image_url: i.image_path ? urls[i.image_path] ?? null : null }))} canWrite={canWrite} />;
}
