import { SidebarShell, type NavGroup, type NavItem } from "@/components/app/sidebar-shell";
import { getMyProjects, requireUser } from "@/lib/access";
import { NOINDEX } from "@/lib/seo";

export const metadata = { robots: NOINDEX };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireUser();
  const projects = (await getMyProjects()).filter((p) => !p.archived_at);

  const groups: NavGroup[] = [
    {
      title: "Akun",
      items: [
        { href: "/akun", label: "Profil & Lisensi", icon: "user", exact: true },
        { href: "/akun/tagihan", label: "Tagihan", icon: "tagihan" },
      ],
    },
    {
      title: "Ruang Kerja",
      items: projects.length
        ? projects.map((p) => ({ href: `/w/${p.id}`, label: p.title, icon: "home" as const }))
        : [{ href: "/mulai", label: "Mulai merencanakan", icon: "home" as const }],
    },
    ...(profile?.role === "admin" ? [{ title: "Admin", items: [{ href: "/admin", label: "Panel Admin", icon: "admin" as const }] }] : []),
  ];

  const mobileTabs: NavItem[] = [
    { href: "/akun", label: "Profil", icon: "user", exact: true },
    { href: "/akun/tagihan", label: "Tagihan", icon: "tagihan" },
    { href: projects[0] ? `/w/${projects[0].id}` : "/mulai", label: "Ruang Kerja", icon: "home" },
  ];

  return (
    <SidebarShell
      context="Akun saya"
      contextLabel=""
      contextHref="/akun"
      groups={groups}
      mobileTabs={mobileTabs}
      user={{ name: profile?.full_name ?? null, email: profile?.email ?? user.email ?? "", avatar: profile?.avatar_url ?? null, isAdmin: profile?.role === "admin" }}
    >
      {children}
    </SidebarShell>
  );
}
