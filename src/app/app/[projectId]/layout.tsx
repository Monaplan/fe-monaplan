import { Suspense } from "react";
import { RowHighlight } from "@/components/app/row-highlight";
import { SidebarShell, type NavGroup, type NavItem } from "@/components/app/sidebar-shell";
import { AccessStatusCard } from "@/components/app/access-card";
import { ReadOnlyBanner } from "@/components/app/read-only-banner";
import { getProjectContext, peekProject } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { formatDateCompact, todayISO } from "@/lib/format";
import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { projectPath } from "@/lib/paths";
import { NOINDEX } from "@/lib/seo";
import { getI18n } from "@/i18n/server";

export const metadata = { robots: NOINDEX };

async function loadExtras(projectId: string, timezone: string) {
  const supabase = await createClient();
  const today = todayISO(timezone);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ count: overdue }, { count: rsvpNew }, { data: notifications }, { count: pendingInv }] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("project_id", projectId).neq("status", "done").lt("due_date", today),
    supabase.from("guests").select("*", { count: "exact", head: true }).eq("project_id", projectId).gte("rsvp_responded_at", weekAgo),
    supabase.from("notifications").select("id, type, title, body, link_path, read_at, created_at").eq("channel", "in_app")
      .lte("scheduled_for", new Date().toISOString()).order("created_at", { ascending: false }).limit(15),
    supabase.from("project_invitations").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "pending"),
  ]);
  return { overdue: overdue ?? 0, rsvpNew: rsvpNew ?? 0, notifications: notifications ?? [], pendingInv: pendingInv ?? 0 };
}

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { t, lang } = await getI18n();
  const { projectId: ref } = await params;
  // Lencana, notifikasi, dan undangan tidak bergantung pada hasil konteks. Bila proyek sudah dikenal di memori,
  // semuanya dimulai bersamaan dengan konteks sehingga satu putaran ke database terhemat.
  const hint = peekProject(ref);
  const ctxPromise = getProjectContext(ref);
  const extrasPromise = hint
    ? loadExtras(hint.projectId, hint.timezone)
    : ctxPromise.then((c) => loadExtras(c.projectId, c.project.timezone));
  const [ctx, extras] = await Promise.all([ctxPromise, extrasPromise]);
  const { supabase, project, projectId, session, access, isOwner, role, members } = ctx;

  // Alamat lama (UUID atau slug yang sudah diganti) dialihkan ke slug terbaru dengan sisa path yang sama
  if (project.slug && ref !== project.slug) {
    const current = (await headers()).get("x-pathname") ?? projectPath(project);
    redirect(current.replace(/^\/app\/[^/?#]+/, projectPath(project)));
  }
  const { overdue, rsvpNew, notifications } = extras;
  const pendingInv = isOwner ? extras.pendingInv : 0;
  // Penanda proyek terakhir dibuka ditulis setelah respons terkirim, supaya tidak menambah waktu muat
  if (session.profile?.last_active_project_id !== projectId) {
    after(async () => {
      await supabase.from("profiles").update({ last_active_project_id: projectId }).eq("id", session.user.id);
    });
  }

  const base = projectPath(project);
  const groups: NavGroup[] = [
    {
      title: t("Menu Utama"),
      items: [
        { href: base, label: t("Dashboard"), icon: "dashboard", exact: true },
        { href: `${base}/checklist`, label: t("To Do Checklist"), icon: "checklist", badge: overdue ?? 0, badgeTone: "danger" },
        { href: `${base}/budget`, label: t("Budgeting"), icon: "budget" },
        { href: `${base}/vendor`, label: t("Kelola Vendor"), icon: "vendor" },
        { href: `${base}/tamu`, label: t("Tamu & RSVP"), icon: "tamu", badge: rsvpNew ?? 0 },
      ],
    },
    {
      title: t("Persiapan"),
      items: [
        { href: `${base}/rundown`, label: t("Rundown Hari H"), icon: "rundown" },
        { href: `${base}/mahar-seserahan`, label: t("Mahar & Seserahan"), icon: "gift" },
        { href: `${base}/dokumen`, label: t("Dokumen Penting"), icon: "dokumen" },
        { href: `${base}/kalender`, label: t("Reminder & Calendar"), icon: "kalender" },
      ],
    },
    {
      title: t("Bonus"),
      items: [
        { href: `${base}/rona-impian`, label: t("Rona Impian"), icon: "palette" },
        { href: `${base}/honeymoon-planner`, label: t("Honeymoon Planner"), icon: "plane" },
      ],
    },
    {
      title: t("Umum"),
      items: [
        { href: `${base}/pengaturan`, label: t("Pengaturan Pernikahan"), icon: "pengaturan" },
        { href: `${base}/panduan`, label: t("Panduan Penggunaan"), icon: "panduan" },
        { href: `${base}/bantuan`, label: t("Pusat Bantuan"), icon: "bantuan" },
      ],
    },
  ];
  const mobileTabs: NavItem[] = [
    { href: base, label: t("Beranda"), icon: "home", exact: true },
    { href: `${base}/checklist`, label: t("Checklist"), icon: "checklist", badge: overdue ?? 0 },
    { href: `${base}/budget`, label: t("Budget"), icon: "budget" },
    { href: `${base}/tamu`, label: t("Tamu"), icon: "tamu" },
  ];

  const canInvite = isOwner && members.length - 1 + (pendingInv ?? 0) < 3;

  return (
    <SidebarShell
      context={project.title}
      contextLabel={project.wedding_date ? t("Hari H {date}", { date: formatDateCompact(project.wedding_date, undefined, lang) }) : ""}
      contextHref={base}
      groups={groups}
      mobileTabs={mobileTabs}
      searchBase={`${base}/cari`}
      helpHref={`${base}/bantuan`}
      notifications={notifications ?? []}
      userId={session.user.id}
      user={{
        name: session.profile?.full_name ?? null,
        email: session.profile?.email ?? session.user.email ?? "",
        avatar: session.profile?.avatar_url ?? null,
        isAdmin: session.profile?.role === "admin",
      }}
      footer={<AccessStatusCard access={access} isOwner={isOwner} base={base} canInvite={canInvite} />}
    >
      <ReadOnlyBanner access={access} isOwner={isOwner} role={role} archived={!!project.archived_at} />
      {children}
      <Suspense fallback={null}><RowHighlight /></Suspense>
    </SidebarShell>
  );
}
