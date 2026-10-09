import { getProjectContext } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/constants";
import { SettingsClient } from "./settings-client";
import { getDownloadUrl } from "@/lib/storage";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Pengaturan Pernikahan") };
}

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { projectId: ref } = await params;
  const { tab } = await searchParams;
  const { supabase, project, members, canWrite, isOwner, session, projectId } = await getProjectContext(ref);

  const [{ data: events }, { data: invitations }, lic, coverUrl] = await Promise.all([
    supabase.from("wedding_events").select("*").eq("project_id", projectId).order("sort_order").order("starts_at"),
    isOwner
      ? supabase.from("project_invitations").select("id, email, role, status, token, expires_at").eq("project_id", projectId).eq("status", "pending").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    isOwner
      ? createAdminClient().from("licenses").select("plans(max_collaborators)")
          .eq("user_id", project.owner_id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    project.cover_image_path ? getDownloadUrl(project.cover_image_path, { expiresIn: 3600 }) : Promise.resolve(null),
  ]);
  const maxCollaborators: number = (lic.data as any)?.plans?.max_collaborators ?? 3;

  return (
    <SettingsClient
      initialTab={tab ?? "pasangan"}
      project={project}
      events={events ?? []}
      members={members}
      invitations={(invitations ?? []).map((i: any) => ({ ...i, link: `${appUrl()}/gabung/${i.token}` }))}
      maxCollaborators={maxCollaborators}
      coverUrl={coverUrl}
      canWrite={canWrite}
      isOwner={isOwner}
      currentUserId={session.user.id}
    />
  );
}
