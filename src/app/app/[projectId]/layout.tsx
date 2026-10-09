import { SidebarShell, type NavGroup, type NavItem } from "@/components/app/sidebar-shell";
import { AccessStatusCard } from "@/components/app/access-card";
import { ReadOnlyBanner } from "@/components/app/read-only-banner";
import { getProjectContext } from "@/lib/access";
import { formatDateCompact, todayISO } from "@/lib/format";
import { after } from "next/server";
import { NOINDEX } from "@/lib/seo";

export const metadata = { robots: NOINDEX };

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await getProjectContext(projectId);
  const { supabase, project, session, access, isOwner, role, members } = ctx;
  const today = todayISO(project.timezone);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [{ count: overdue }, { count: rsvpNew }, { data: notifications }, { count: pendingInv }] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("project_id", projectId).neq("status", "done").lt("due_date", today),
    supabase.from("guests").select("*", { count: "exact", head: true }).eq("project_id", projectId).gte("rsvp_responded_at", weekAgo),
    supabase.from("notifications").select("id, title, body, link_path, read_at, created_at").eq("channel", "in_app")
      .lte("scheduled_for", new Date().toISOString()).order("created_at", { ascending: false }).limit(15),
    isOwner
      ? supabase.from("project_invitations").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);
  // Penanda proyek terakhir dibuka ditulis setelah respons terkirim, supaya tidak menambah waktu muat
  if (session.profile?.last_active_project_id !== projectId) {
    after(async () => {
      await supabase.from("profiles").update({ last_active_project_id: projectId }).eq("id", session.user.id);
    });
  }

  const base = `/w/${projectId}`;
  const groups: NavGroup[] = [
    {
      title: "Menu Utama",
      items: [
        { href: base, label: "Dashboard", icon: "dashboard", exact: true },
        { href: `${base}/checklist`, label: "To Do Checklist", icon: "checklist", badge: overdue ?? 0, badgeTone: "danger" },
        { href: `${base}/budget`, label: "Budgeting", icon: "budget" },
        { href: `${base}/vendor`, label: "Kelola Vendor", icon: "vendor" },
        { href: `${base}/tamu`, label: "Tamu & RSVP", icon: "tamu", badge: rsvpNew ?? 0 },
      ],
    },
    {
      title: "Persiapan",
      items: [
        { href: `${base}/rundown`, label: "Rundown Hari H", icon: "rundown" },
        { href: `${base}/mahar-seserahan`, label: "Mahar & Seserahan", icon: "gift" },
        { href: `${base}/dokumen`, label: "Dokumen Penting", icon: "dokumen" },
        { href: `${base}/kalender`, label: "Reminder & Calendar", icon: "kalender" },
      ],
    },
    {
      title: "Umum",
      items: [
        { href: `${base}/pengaturan`, label: "Pengaturan Pernikahan", icon: "pengaturan" },
        { href: `${base}/panduan`, label: "Panduan Penggunaan", icon: "panduan" },
        { href: "mailto:halo@monaplan.id", label: "Bantuan", icon: "bantuan", external: true },
      ],
    },
  ];
  const mobileTabs: NavItem[] = [
    { href: base, label: "Beranda", icon: "home", exact: true },
    { href: `${base}/checklist`, label: "Checklist", icon: "checklist", badge: overdue ?? 0 },
    { href: `${base}/budget`, label: "Budget", icon: "budget" },
    { href: `${base}/tamu`, label: "Tamu", icon: "tamu" },
  ];

  const canInvite = isOwner && members.length - 1 + (pendingInv ?? 0) < 3;

  return (
    <SidebarShell
      context={project.title}
      contextLabel={project.wedding_date ? `Hari H ${formatDateCompact(project.wedding_date)}` : ""}
      contextHref={base}
      groups={groups}
      mobileTabs={mobileTabs}
      searchBase={`${base}/cari`}
      notifications={notifications ?? []}
      user={{
        name: session.profile?.full_name ?? null,
        email: session.profile?.email ?? session.user.email ?? "",
        avatar: session.profile?.avatar_url ?? null,
        isAdmin: session.profile?.role === "admin",
      }}
      footer={<AccessStatusCard access={access} isOwner={isOwner} projectId={projectId} canInvite={canInvite} />}
    >
      <ReadOnlyBanner access={access} isOwner={isOwner} role={role} archived={!!project.archived_at} />
      {children}
    </SidebarShell>
  );
}
