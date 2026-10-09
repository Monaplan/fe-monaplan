import { redirect } from "next/navigation";
import { getMyAccess, getMyProjects, isActive, requireUser } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { projectPath } from "@/lib/paths";

// Router setelah login (PRD 5.1): proyek → dashboard, akses aktif tanpa proyek → onboarding,
// akun baru + trial aktif → mulai trial lalu onboarding, selain itu → aktivasi
export default async function StartPage() {
  const { profile } = await requireUser();
  const projects = (await getMyProjects()).filter((p) => !p.archived_at);

  if (projects.length) {
    const target = projects.find((p) => p.id === profile?.last_active_project_id) ?? projects[0]!;
    redirect(projectPath(target));
  }
  const access = await getMyAccess();
  if (isActive(access)) redirect("/onboarding");
  if (profile?.role === "admin") redirect("/admin");

  // Hanya akun yang belum pernah punya lisensi apa pun yang berhak atas trial
  if (access.state === "none" && (await getSettings()).trial.enabled) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("start_trial");
    if (!error) redirect("/onboarding");
  }
  redirect("/aktivasi");
}
