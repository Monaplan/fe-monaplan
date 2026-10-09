import { SidebarShell, type NavGroup, type NavItem } from "@/components/app/sidebar-shell";
import { requireAdmin } from "@/lib/access";
import { NOINDEX } from "@/lib/seo";
import { getI18n } from "@/i18n/server";

export const metadata = { title: { default: "Admin", template: "%s · Admin Monaplan" }, robots: NOINDEX };

const GROUPS: NavGroup[] = [
  { title: "Ikhtisar", items: [{ href: "/admin", label: "Ringkasan", icon: "dashboard", exact: true }] },
  {
    title: "Penjualan",
    items: [
      { href: "/admin/kode", label: "Kode Akses", icon: "kode" },
      { href: "/admin/order", label: "Order", icon: "order" },
    ],
  },
  {
    title: "Konfigurasi",
    items: [
      { href: "/admin/paket", label: "Paket", icon: "paket" },
      { href: "/admin/trial", label: "Trial", icon: "trial" },
      { href: "/admin/promo", label: "Promo", icon: "promo" },
      { href: "/admin/email", label: "Email", icon: "email" },
    ],
  },
  {
    title: "Pelanggan",
    items: [
      { href: "/admin/lisensi", label: "Lisensi", icon: "lisensi" },
      { href: "/admin/pengguna", label: "Pengguna", icon: "pengguna" },
      { href: "/admin/bantuan", label: "Bantuan masuk", icon: "bantuan" },
    ],
  },
  { title: "Sistem", items: [{ href: "/admin/audit", label: "Log Audit", icon: "audit" }] },
  { title: "Pintasan", items: [{ href: "/mulai", label: "Buka aplikasi", icon: "switch" }] },
];

const MOBILE_TABS: NavItem[] = [
  { href: "/admin", label: "Ringkasan", icon: "dashboard", exact: true },
  { href: "/admin/order", label: "Order", icon: "order" },
  { href: "/admin/pengguna", label: "Pengguna", icon: "pengguna" },
  { href: "/admin/promo", label: "Promo", icon: "promo" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  const { profile, user } = await requireAdmin();
  return (
    <SidebarShell
      context={t("Panel Admin")}
      contextLabel=""
      contextHref="/admin"
      groups={GROUPS}
      mobileTabs={MOBILE_TABS}
      user={{ name: profile?.full_name ?? null, email: profile?.email ?? user.email ?? "", avatar: profile?.avatar_url ?? null, isAdmin: true }}
    >
      {children}
    </SidebarShell>
  );
}
