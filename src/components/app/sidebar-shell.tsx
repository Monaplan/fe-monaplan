"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight, BadgeCheck, Bell, BookOpen, CalendarDays, ChevronDown, ChevronsLeft, ChevronsUpDown, CircleHelp, Clock,
  FileText, Gift, Hourglass, MessageCircle, Palette, Plane, House, KeyRound, LayoutGrid, ListChecks, LogOut, Mail, Menu, Package, ReceiptText, Search, Shield,
  ScrollText, Server, SlidersHorizontal, Store, Tag, UserRound, Users, Wallet, X,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import { initials } from "@/lib/format";
import { NotificationBell, type Notif } from "./notification-bell";
import { HelpMenu } from "./help-menu";
import { SearchBox } from "./search-box";
import { supportWhatsappUrl } from "@/lib/support";
import { ThemeSwitcher, ThemeToggle } from "./theme";
import { LanguageSwitcher } from "./language-switcher";
import { useT } from "@/i18n/client";

// Ikon dirujuk dengan nama agar konfigurasi navigasi bisa dikirim dari Server Component
const ICONS = {
  dashboard: LayoutGrid, checklist: ListChecks, budget: Wallet, vendor: Store, tamu: Mail, rundown: Clock, gift: Gift,
  dokumen: FileText, kalender: CalendarDays, pengaturan: SlidersHorizontal, panduan: BookOpen, bantuan: CircleHelp,
  home: House, user: UserRound, tagihan: ReceiptText, admin: Shield, paket: Package, kode: KeyRound, order: ReceiptText,
  palette: Palette, plane: Plane, lisensi: BadgeCheck, pengguna: Users, audit: ScrollText, sistem: Server, switch: ArrowLeftRight, trial: Hourglass, promo: Tag, email: Mail,
} as const;
export type IconKey = keyof typeof ICONS;

export type NavItem = { tag?: string; href: string; label: string; icon: IconKey; badge?: number; badgeTone?: "danger" | "neutral"; exact?: boolean; external?: boolean };
export type NavGroup = { title: string; items: NavItem[] };
type ShellUser = { name: string | null; email: string; avatar: string | null; isAdmin: boolean };

function Icon({ name, className }: { name: IconKey; className?: string }) {
  const C = ICONS[name];
  return <C className={className} strokeWidth={1.75} />;
}

export function SidebarShell({
  context, contextHref, contextLabel, groups, user, notifications, userId, searchBase, footer, mobileTabs, helpHref, children,
}: {
  context: string;
  contextLabel: string;
  contextHref: string;
  groups: NavGroup[];
  user: ShellUser;
  notifications?: Notif[];
  userId?: string;
  searchBase?: string;
  footer?: ReactNode;
  mobileTabs?: NavItem[];
  helpHref?: string;
  children: ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState(false);
  // Judul grup yang ditutup pengguna; tersimpan di peramban. Grup berisi halaman aktif selalu terbuka.
  const [closed, setClosed] = useState<string[]>([]);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("mp-sidebar") === "1"); } catch {}
    try {
      const saved = JSON.parse(localStorage.getItem("mp-nav-groups") ?? "[]");
      if (Array.isArray(saved)) setClosed(saved.filter((x): x is string => typeof x === "string"));
    } catch {}
  }, []);
  useEffect(() => setSheet(false), [pathname]);
  useEscape(sheet, () => setSheet(false));
  // Kunci gulir halaman di belakang bottom sheet
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sheet]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("mp-sidebar", next ? "1" : "0"); } catch {}
  };
  // Kunci grup memakai alamat item pertamanya, bukan judul, supaya pilihan buka-tutup tetap berlaku saat bahasa diganti
  const gkey = (g: NavGroup) => g.items[0]?.href ?? g.title;
  const toggleGroup = (key: string) => {
    const next = closed.includes(key) ? closed.filter((x) => x !== key) : [...closed, key];
    setClosed(next);
    try { localStorage.setItem("mp-nav-groups", JSON.stringify(next)); } catch {}
  };
  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));
  const activeItem = groups.flatMap((g) => g.items).filter(isActive).sort((a, b) => b.href.length - a.href.length)[0];
  // Tab bawah di HP: empat tujuan utama + Menu. Bila layout tidak menentukan, ambil empat item pertama.
  const tabs = mobileTabs ?? groups.flatMap((g) => g.items).filter((i) => !i.external).slice(0, 4);
  const menuActive = !tabs.some(isActive);

  const sidebar = (rail: boolean) => (
    <div className="flex h-full flex-col">
      {/* Brand dan konteks */}
      <div className="flex items-center gap-2 px-3 pt-5 pb-5">
        <Link href={contextHref} className={cn("flex min-w-0 items-center gap-2.5 transition-[padding] duration-300 ease-[var(--ease-out-soft)]", rail && "mx-auto")} aria-label={t("Monaplan")}>
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#A9557E] to-[#5A2541] font-display text-xl font-semibold text-white italic shadow-btn">{t("M")}</span>
          <span className={cn("min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-[var(--ease-out-soft)]", rail ? "max-w-0 opacity-0" : "max-w-[190px] opacity-100")} aria-hidden={rail}>
            <span className="block font-display text-[21px] leading-6 font-semibold text-neutral-900">{t("Monaplan")}</span>
            <span className="block truncate text-[12px] font-medium text-plum-600">{context}</span>
          </span>
        </Link>
      </div>


      <nav data-tour="nav" className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4" aria-label={t("Navigasi")}>
        {groups.map((g) => {
          const foldable = g.items.length > 1;
          const open = !foldable || rail || !closed.includes(gkey(g)) || g.items.some(isActive);
          const headCls = "overflow-hidden px-3 text-[10.5px] font-semibold tracking-[0.12em] whitespace-nowrap text-neutral-400 uppercase transition-[max-height,opacity,margin] duration-300 ease-[var(--ease-out-soft)]";
          return (
          <div key={g.title} className="mb-4">
            {foldable && !rail ? (
              <button type="button" onClick={() => toggleGroup(gkey(g))} aria-expanded={open} aria-controls={`nav-${gkey(g)}`}
                className={cn(headCls, "mb-1.5 flex max-h-5 w-full items-center justify-between rounded-md opacity-100 hover:text-neutral-600 focus-visible:ring-2 focus-visible:ring-plum-300 focus-visible:outline-none")}>
                <span>{t(g.title)}</span>
                <ChevronDown className={cn("size-3.5 shrink-0 transition-transform duration-300", !open && "-rotate-90")} aria-hidden="true" />
              </button>
            ) : (
              <p className={cn(headCls, rail ? "mb-0 max-h-0 opacity-0" : "mb-1.5 max-h-5 opacity-100")} aria-hidden={rail}>{t(g.title)}</p>
            )}
            <div className={cn("mx-auto h-px bg-neutral-200 transition-[width,opacity,margin] duration-300 ease-[var(--ease-out-soft)]", rail ? "mb-2 w-6 opacity-100" : "mb-0 w-0 opacity-0")} />
            <div id={`nav-${gkey(g)}`} inert={!open} className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-soft)]", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
            <div className="-mx-3 min-h-0 overflow-hidden px-3">
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => {
                const active = isActive(item);
                const cls = cn(
                  "group relative flex h-9 items-center rounded-xl px-3 text-[13.5px] font-medium transition-[background-color,color,box-shadow] duration-200",
                  rail && "justify-center",
                  active ? "bg-plum-50 text-plum-700 ring-1 ring-plum-100" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                );
                const inner = (
                  <>
                    <span className={cn("absolute top-2 bottom-2 -left-3 w-[3px] origin-center rounded-r-full bg-plum-600 transition-transform duration-300 ease-[var(--ease-out-soft)]", active ? "scale-y-100" : "scale-y-0")} />
                    <Icon name={item.icon} className={cn("size-[18px] shrink-0 transition-[color,transform] duration-200 group-hover:scale-110", active ? "text-plum-600" : "text-neutral-400 group-hover:text-neutral-600")} />
                    <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-[var(--ease-out-soft)]", rail ? "ml-0 max-w-0 flex-none opacity-0" : "ml-3 max-w-[200px] flex-1 truncate opacity-100")} aria-hidden={rail}>{t(item.label)}</span>
                    {item.tag && !rail && <span className="rounded-full bg-plum-100 px-1.5 text-[10px] leading-4 font-semibold tracking-wide text-plum-700 uppercase">{t(item.tag)}</span>}
                    {!!item.badge && (rail
                      ? <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger" />
                      : <span className={cn("tabular rounded-full px-1.5 text-[11px] leading-5 font-semibold", item.badgeTone === "danger" ? "bg-danger-bg text-danger" : "bg-plum-100 text-plum-700")}>{item.badge}</span>)}
                  </>
                );
                return (
                  <li key={item.href}>
                    {item.external
                      ? <a href={item.href} title={t(item.label)} className={cls}>{inner}</a>
                      : <Link href={item.href} title={rail ? t(item.label) : undefined} className={cls} aria-current={active ? "page" : undefined}>{inner}</Link>}
                  </li>
                );
              })}
            </ul>
            </div>
            </div>
          </div>
          );
        })}
      </nav>

      <div className={cn("flex flex-col gap-3 border-t border-neutral-200/80 p-3", rail && "items-center")}>
        {!rail && footer}
        <UserMenu user={user} rail={rail} />
      </div>
    </div>
  );

  return (
    <div className="app-canvas min-h-dvh">
      {/* Sidebar desktop */}
      <aside className={cn(
        "no-print fixed inset-y-3 left-3 z-30 hidden rounded-2xl border border-neutral-200/80 bg-surface/95 shadow-card backdrop-blur transition-[width] duration-300 ease-[var(--ease-out-soft)] md:block",
        collapsed ? "w-[76px]" : "w-[76px] xl:w-[264px]",
      )}>
        <div className="hidden h-full xl:block">{sidebar(collapsed)}</div>
        <div className="h-full xl:hidden">{sidebar(true)}</div>
        <button onClick={toggle} aria-label={collapsed ? t("Buka sidebar") : t("Ciutkan sidebar")}
          className="absolute top-7 -right-3 hidden size-6 items-center justify-center rounded-full border border-neutral-200 bg-surface text-neutral-500 shadow-sm hover:text-plum-700 xl:inline-flex">
          <ChevronsLeft className={cn("size-3.5 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Menu HP: bottom sheet seperti aplikasi mobile */}
      {sheet && <MobileSheet groups={groups} user={user} footer={footer} isActive={isActive} closed={closed} onToggle={toggleGroup} onClose={() => setSheet(false)} />}

      <div className={cn("flex min-h-dvh flex-col transition-[padding] duration-300 ease-[var(--ease-out-soft)]", collapsed ? "md:pl-[92px]" : "md:pl-[92px] xl:pl-[280px]")}>
        {/* Top bar */}
        <header className="no-print sticky top-0 z-20 border-b border-neutral-200/60 bg-canvas/80 pt-[env(safe-area-inset-top)] backdrop-blur-md md:border-0 md:bg-transparent md:pt-0 md:backdrop-blur-none">
          <div className="flex h-14 items-center gap-1 px-4 md:h-[72px] md:gap-2 md:px-6">
            {/* HP: hanya logo dan nama Monaplan; judul halaman sudah ada di isi halaman */}
            <Link href={contextHref} aria-label={t("Monaplan")} className="flex min-w-0 flex-1 items-center gap-2.5 md:hidden">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#A9557E] to-[#5A2541] font-display text-xl font-semibold text-white italic shadow-btn">{t("M")}</span>
              <span className="font-display text-[22px] leading-6 font-semibold text-neutral-900">{t("Monaplan")}</span>
            </Link>
            <div className="hidden min-w-0 flex-1 md:block">
              <p className="truncate text-[11.5px] leading-4 text-neutral-500 md:text-[12px]">{context}{contextLabel && <span className="hidden text-neutral-400 md:inline"> · {contextLabel}</span>}</p>
              <p className="truncate text-[16px] leading-5 font-semibold text-neutral-900 md:text-base">{activeItem ? t(activeItem.label) : context}</p>
            </div>
            {searchBase && <SearchBox base={searchBase} className="hidden lg:block" />}
            {searchBase && (
              <Link href={searchBase} aria-label={t("Cari")} className="inline-flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-surface lg:hidden"><Search className="size-5" /></Link>
            )}
            <LanguageSwitcher compact className="mr-1 ml-2 hidden sm:inline-flex" />
            <HelpMenu helpHref={helpHref ?? "/akun/bantuan"} context={context} />
            <span className="hidden sm:block"><ThemeToggle className="hover:bg-surface" /></span>
            {notifications && userId && <NotificationBell initial={notifications} userId={userId} />}
          </div>
        </header>

        <main className="flex-1 px-4 pt-2 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      {/* Navigasi bawah HP: menempel di tepi layar seperti aplikasi mobile */}
      <nav data-tour="mobile-nav" aria-label={t("Navigasi utama")} className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid h-[60px]" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
          {tabs.map((item) => {
            const active = isActive(item);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={cn("relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-opacity active:opacity-60", active ? "text-plum-700" : "text-neutral-500")}>
                <span className={cn("relative inline-flex h-7 w-14 items-center justify-center rounded-full transition-colors", active && "bg-plum-100")}>
                  <Icon name={item.icon} className="size-[22px]" />
                  {!!item.badge && <span className="absolute top-0.5 right-3 size-2 rounded-full bg-danger ring-2 ring-surface" />}
                </span>
                {t(item.label)}
              </Link>
            );
          })}
          <button onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet}
            className={cn("flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-opacity active:opacity-60", menuActive ? "text-plum-700" : "text-neutral-500")}>
            <span className={cn("inline-flex h-7 w-14 items-center justify-center rounded-full transition-colors", menuActive && "bg-plum-100")}><Menu className="size-[22px]" strokeWidth={1.75} /></span>{t("Menu")}</button>
        </div>
      </nav>
    </div>
  );
}

// Lembar menu penuh untuk HP: semua tujuan dalam grid ikon, kartu akses, tema, dan keluar
function MobileSheet({ groups, user, footer, isActive, onClose, closed, onToggle }: {
  groups: NavGroup[];
  closed: string[];
  onToggle: (title: string) => void;
  user: ShellUser;
  footer?: ReactNode;
  isActive: (item: NavItem) => boolean;
  onClose: () => void;
}) {
  const t = useT();
  const pathname = usePathname();
  const links: { href: string; icon: IconKey; label: string }[] = [
    { href: "/mulai", icon: "home", label: t("Ruang kerja") },
    { href: "/akun", icon: "user", label: t("Profil & Lisensi") },
    { href: "/akun/tagihan", icon: "tagihan", label: t("Tagihan") },
    ...(user.isAdmin ? [{ href: "/admin", icon: "admin" as const, label: t("Panel Admin") }] : []),
  ];
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t("Menu")}>
      <div className="animate-fade-in absolute inset-0 bg-[rgba(28,22,25,0.45)]" onClick={onClose} />
      <div className="animate-sheet-up absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border-t border-neutral-200/70 bg-surface shadow-modal">
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-neutral-300" aria-hidden="true" />
        <div className="flex items-center gap-3 px-5 pt-3 pb-4">
          <Avatar user={user} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-neutral-900">{user.name ?? user.email.split("@")[0]}</p>
            <p className="truncate text-xs text-neutral-500">{user.email}</p>
          </div>
          <button onClick={onClose} aria-label={t("Tutup menu")} className="inline-flex size-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"><X className="size-5" /></button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {groups.map((g) => {
            const foldable = g.items.length > 1;
            const open = !foldable || !closed.includes(g.items[0]?.href ?? g.title) || g.items.some(isActive);
            return (
            <section key={g.title} aria-label={t(g.title)} className="mb-5">
              {foldable ? (
                <h2 className="mb-2.5">
                  <button type="button" onClick={() => onToggle(g.items[0]?.href ?? g.title)} aria-expanded={open}
                    className="flex w-full items-center justify-between text-[10.5px] font-semibold tracking-[0.12em] text-neutral-400 uppercase">
                    {t(g.title)}
                    <ChevronDown className={cn("size-4 transition-transform duration-300", !open && "-rotate-90")} aria-hidden="true" />
                  </button>
                </h2>
              ) : (
                <h2 className="mb-2.5 text-[10.5px] font-semibold tracking-[0.12em] text-neutral-400 uppercase">{t(g.title)}</h2>
              )}
              <div inert={!open} className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-soft)]", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
              <div className="min-h-0 overflow-hidden">
              <ul className="grid grid-cols-4 gap-x-2 gap-y-3">
                {g.items.map((item) => {
                  const active = isActive(item);
                  const inner = (
                    <>
                      <span className={cn("relative inline-flex size-12 items-center justify-center rounded-2xl ring-1 transition-colors", active ? "bg-plum-100 text-plum-700 ring-plum-200" : "bg-neutral-50 text-neutral-600 ring-neutral-200/70")}>
                        <Icon name={item.icon} className="size-[22px]" />
                        {!!item.badge && <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-danger-solid px-1 text-center text-[10px] leading-4 font-semibold text-white">{item.badge}</span>}
                      </span>
                      <span className={cn("line-clamp-2 text-center text-[11.5px] leading-[14px] font-medium", active ? "text-plum-700" : "text-neutral-700")}>{t(item.label)}</span>
                    </>
                  );
                  const cls = "flex flex-col items-center gap-1.5 rounded-xl py-1 transition-opacity active:opacity-60";
                  return (
                    <li key={item.href}>
                      {item.external
                        ? <a href={item.href} className={cls}>{inner}</a>
                        : <Link href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={cls}>{inner}</Link>}
                    </li>
                  );
                })}
              </ul>
              </div>
              </div>
            </section>
            );
          })}

          {footer && <div className="mb-5">{footer}</div>}

          <div className="mb-4 rounded-2xl bg-neutral-50 p-3">
            <p className="mb-2 text-[11px] font-medium text-neutral-500">{t("Tema")}</p>
            <ThemeSwitcher compact />
            <p className="mt-3 mb-2 text-[11px] font-medium text-neutral-500">{t("Bahasa")}</p>
            <LanguageSwitcher />
          </div>

          <div className="flex flex-col">
            {links.map((l) => <MenuLink key={l.href} href={l.href} icon={l.icon} label={t(l.label)} onClick={onClose} />)}
            {supportWhatsappUrl("Halo admin Monaplan, saya butuh bantuan.") && (
              <a href={supportWhatsappUrl(`Halo admin Monaplan, saya butuh bantuan.
Halaman: ${pathname}`)!} target="_blank" rel="noopener noreferrer" onClick={onClose}
                className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] text-neutral-700 hover:bg-neutral-100"><MessageCircle className="size-4 text-[#1FA855]" />{t("Chat WhatsApp admin")}</a>
            )}
            <form action="/auth/signout" method="post">
              <button className="flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-[14px] font-medium text-danger hover:bg-danger-bg"><LogOut className="size-4" />{t("Keluar")}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Avatar({ user, size = 36 }: { user: { name: string | null; email: string; avatar: string | null }; size?: number }) {
  return user.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar} alt="" width={size} height={size} referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover ring-2 ring-surface" style={{ width: size, height: size }} />
  ) : (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-plum-100 to-plum-200 text-xs font-semibold text-plum-800 ring-2 ring-surface" style={{ width: size, height: size }}>
      {initials(user.name ?? user.email)}
    </span>
  );
}

// Tutup popover dengan Escape
function useEscape(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);
}

function UserMenu({ user, rail }: { user: ShellUser; rail: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  useEscape(open, () => setOpen(false));
  return (
    <div className="relative w-full">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={t("Menu akun")}
        className={cn("flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-neutral-100", rail && "justify-center")}>
        <Avatar user={user} />
        {!rail && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-neutral-900">{user.name ?? user.email.split("@")[0]}</span>
              <span className="block truncate text-[11.5px] text-neutral-500">{user.email}</span>
            </span>
            <ChevronsUpDown className="size-4 text-neutral-400" />
          </>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={cn("absolute bottom-full z-50 mb-2 w-60 rounded-2xl border border-neutral-200 bg-surface p-1.5 shadow-pop", rail ? "left-0" : "left-0 right-0 w-auto")}>
            <div className="border-b border-neutral-100 px-3 pt-2 pb-2.5">
              <p className="truncate text-[13px] font-semibold">{user.name ?? t("Akun")}</p>
              <p className="truncate text-xs text-neutral-500">{user.email}</p>
            </div>
            <div className="py-1">
              <MenuLink href="/mulai" icon="home" label={t("Ruang kerja")} onClick={() => setOpen(false)} />
              <MenuLink href="/akun" icon="user" label={t("Profil & Lisensi")} onClick={() => setOpen(false)} />
              <MenuLink href="/akun/tagihan" icon="tagihan" label={t("Tagihan")} onClick={() => setOpen(false)} />
              {user.isAdmin && <MenuLink href="/admin" icon="admin" label={t("Panel Admin")} onClick={() => setOpen(false)} />}
            </div>
            <div className="border-t border-neutral-100 px-2 py-2">
              <p className="mb-1.5 px-1 text-[11px] font-medium text-neutral-500">{t("Tema")}</p>
              <ThemeSwitcher compact />
              <p className="mt-2.5 mb-1.5 px-1 text-[11px] font-medium text-neutral-500">{t("Bahasa")}</p>
              <LanguageSwitcher />
            </div>
            <form action="/auth/signout" method="post" className="border-t border-neutral-100 pt-1">
              <button className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-danger hover:bg-danger-bg">
                <LogOut className="size-4" />{t("Keluar")}</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: IconKey; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] text-neutral-700 hover:bg-neutral-100">
      <Icon name={icon} className="size-4 text-neutral-400" />{label}
    </Link>
  );
}

