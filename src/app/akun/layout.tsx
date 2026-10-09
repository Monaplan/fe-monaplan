import { SidebarShell, type NavGroup, type NavItem } from "@/components/app/sidebar-shell";
import { getMyProjects, requireUser } from "@/lib/access";
import { NOINDEX } from "@/lib/seo";
import { projectPath } from "@/lib/paths";
import { getI18n } from "@/i18n/server";

export const metadata = { robots: NOINDEX };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  const { profile, user } = await requireUser();
  const projects = (await getMyProjects()).filter((p) => !p.archived_at);

  const groups: NavGroup[] = [
    {
      title: t("Akun"),
      items: [
        { href: "/akun", label: t("Profil & Lisensi"), icon: "user", exact: true },
        { href: "/akun/tagihan", label: t("Tagihan"), icon: "tagihan" },
        { href: "/akun/bantuan", label: t("Pusat Bantuan"), icon: "bantuan" },
      ],
    },
    {
      title: t("Ruang Kerja"),
      items: projects.length
        ? projects.map((p) => ({ href: projectPath(p), label: p.title, icon: "home" as const }))
        : [{ href: "/mulai", label: t("Mulai merencanakan"), icon: "home" as const }],
    },
    ...(profile?.role === "admin" ? [{ title: t("Admin"), items: [{ href: "/admin", label: t("Panel Admin"), icon: "admin" as const }] }] : []),
  ];

  const mobileTabs: NavItem[] = [
    { href: "/akun", label: t("Profil"), icon: "user", exact: true },
    { href: "/akun/tagihan", label: t("Tagihan"), icon: "tagihan" },
    { href: projects[0] ? projectPath(projects[0]) : "/mulai", label: t("Ruang Kerja"), icon: "home" },
  ];

  return (
    <SidebarShell
      context={t("Akun saya")}
      contextLabel=""
      contextHref="/akun"
      groups={groups}
      mobileTabs={mobileTabs}
      helpHref="/akun/bantuan"
      user={{ name: profile?.full_name ?? null, email: profile?.email ?? user.email ?? "", avatar: profile?.avatar_url ?? null, isAdmin: profile?.role === "admin" }}
    >
      {children}
    </SidebarShell>
  );
}
