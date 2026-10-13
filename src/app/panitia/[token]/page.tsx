import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { clientIp } from "@/lib/codes";
import { rateLimited } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDayData, projectByStaffToken } from "@/lib/hari-h";
import { NOINDEX } from "@/lib/seo";
import { PanitiaClient } from "./panitia-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panitia Hari H", robots: NOINDEX, referrer: "no-referrer" };

// Halaman panitia tanpa login (PRD 21.4). Token dicocokkan di server; data dibaca dengan service role.
export default async function PanitiaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (rateLimited(`panitia:${clientIp(await headers()) ?? "unknown"}`, 120)) notFound();
  const admin = createAdminClient();
  const project = await projectByStaffToken(admin, token);
  if (!project) notFound();
  const data = await loadDayData(admin, project);
  return (
    <main className="min-h-dvh bg-canvas px-4 pt-5 pb-10 sm:px-6">
      <PanitiaClient token={token} data={data} canRecordGifts={!!project.staff_can_record_gifts} />
    </main>
  );
}
