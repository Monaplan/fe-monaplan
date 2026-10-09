"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight, BadgeCheck, Bell, BookOpen, CalendarDays, ChevronsLeft, ChevronsRight, ChevronsUpDown, CircleHelp, Clock,
  FileText, Gift, Hourglass, House, KeyRound, LayoutGrid, ListChecks, LogOut, Mail, Menu, Package, ReceiptText, Search, Shield,
  ScrollText, SlidersHorizontal, Store, Tag, UserRound, Users, Wallet, X,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import { initials } from "@/lib/format";
import { markNotificationsRead } from "@/features/notifications/actions";
import { startPageTour } from "./product-tour";
import { ThemeSwitcher, ThemeToggle } from "./theme";

// Ikon dirujuk dengan nama agar konfigurasi navigasi bisa dikirim dari Server Component
const ICONS = {
  dashboard: LayoutGrid, checklist: ListChecks, budget: Wallet, vendor: Store, tamu: Mail, rundown: Clock, gift: Gift,
  dokumen: FileText, kalender: CalendarDays, pengaturan: SlidersHorizontal, panduan: BookOpen, bantuan: CircleHelp,
  home: House, user: UserRound, tagihan: ReceiptText, admin: Shield, paket: Package, kode: KeyRound, order: ReceiptText,
  lisensi: BadgeCheck, pengguna: Users, audit: ScrollText, switch: ArrowLeftRight, trial: Hourglass, promo: Tag,
} as const;
export type IconKey = keyof typeof ICONS;

export type NavItem = { href: string; label: string; icon: IconKey; badge?: number; badgeTone?: "danger" | "neutral"; exact?: boolean; external?: boolean };
export type NavGroup = { title: string; items: NavItem[] };
type Notif = { id: string; title: string; body: string | null; link_path: string | null; read_at: string | null; created_at: string };
type ShellUser = { name: string | null; email: string; avatar: string | null; isAdmin: boolean };

function Icon({ name, className }: { name: IconKey; className?: string }) {
  const C = ICONS[name];
  return <C className={className} strokeWidth={1.75} />;
}

export function SidebarShell({
  context, contextHref, contextLabel, groups, user, notifications, searchBase, footer, mobileTabs, children,
}: {
  context: string;
  contextLabel: string;
  contextHref: string;
  groups: NavGroup[];
  user: ShellUser;
  notifications?: Notif[];
  searchBase?: string;
  footer?: ReactNode;
  mobileTabs?: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("mp-sidebar") === "1"); } catch {}
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && searchRef.current) {
        e.preventDefault();
        searchRef.current.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("mp-sidebar", next ? "1" : "0"); } catch {}
  };
  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));
  const activeItem = groups.flatMap((g) => g.items).filter(isActive).sort((a, b) => b.href.length - a.href.length)[0];
  // Tab bawah di HP: empat tujuan utama + Menu. Bila layout tidak menentukan, ambil empat item pertama.
  const tabs = mobileTabs ?? groups.flatMap((g) => g.items).filter((i) => !i.external).slice(0, 4);
  const menuActive = !tabs.some(isActive);

  const sidebar = (rail: boolean) => (
    <div className="flex h-full flex-col">
      {/* Brand dan konteks */}
      <div className={cn("flex items-center gap-2 px-3 pt-5 pb-5", rail && "justify-center px-0")}>
        <Link href={contextHref} className="flex min-w-0 items-center gap-2.5" aria-label="Monaplan">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#A9557E] to-[#5A2541] font-display text-xl font-semibold text-white italic shadow-btn">M</span>
          {!rail && (
            <span className="min-w-0">
              <span className="block font-display text-[21px] leading-6 font-semibold text-neutral-900">Monaplan</span>
              <span className="block truncate text-[12px] font-medium text-plum-600">{context}</span>
            </span>
          )}
        </Link>
      </div>


      <nav data-tour="nav" className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4" aria-label="Navigasi">
        {groups.map((g) => (
          <div key={g.title} className="mb-4">
            {rail ? <div className="mx-auto mb-2 h-px w-6 bg-neutral-200" /> : (
              <p className="mb-1.5 px-3 text-[10.5px] font-semibold tracking-[0.12em] text-neutral-400 uppercase">{g.title}</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => {
                const active = isActive(item);
                const cls = cn(
                  "group relative flex h-9 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors duration-150",
                  rail && "justify-center px-0",
                  active ? "bg-plum-50 text-plum-700 ring-1 ring-plum-100" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                );
                const inner = (
                  <>
                    {active && <span className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-plum-600" />}
                    <Icon name={item.icon} className={cn("size-[18px] shrink-0", active ? "text-plum-600" : "text-neutral-400 group-hover:text-neutral-600")} />
                    {!rail && <span className="flex-1 truncate">{item.label}</span>}
                    {!!item.badge && (rail
                      ? <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger" />
                      : <span className={cn("tabular rounded-full px-1.5 text-[11px] leading-5 font-semibold", item.badgeTone === "danger" ? "bg-danger-bg text-danger" : "bg-plum-100 text-plum-700")}>{item.badge}</span>)}
                  </>
                );
                return (
                  <li key={item.href}>
                    {item.external
                      ? <a href={item.href} title={item.label} className={cls}>{inner}</a>
                      : <Link href={item.href} title={rail ? item.label : undefined} className={cls} aria-current={active ? "page" : undefined}>{inner}</Link>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
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
        "no-print fixed inset-y-3 left-3 z-30 hidden rounded-2xl border border-neutral-200/80 bg-surface/95 shadow-card backdrop-blur transition-[width] duration-200 md:block",
        collapsed ? "w-[76px]" : "w-[76px] xl:w-[264px]",
      )}>
        <div className="hidden h-full xl:block">{sidebar(collapsed)}</div>
        <div className="h-full xl:hidden">{sidebar(true)}</div>
        <button onClick={toggle} aria-label={collapsed ? "Buka sidebar" : "Ciutkan sidebar"}
          className="absolute top-7 -right-3 hidden size-6 items-center justify-center rounded-full border border-neutral-200 bg-surface text-neutral-500 shadow-sm hover:text-plum-700 xl:inline-flex">
          {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
        </button>
      </aside>

      {/* Menu HP: bottom sheet seperti aplikasi mobile */}
      {sheet && <MobileSheet groups={groups} user={user} footer={footer} isActive={isActive} onClose={() => setSheet(false)} />}

      <div className={cn("flex min-h-dvh flex-col transition-[padding] duration-200", collapsed ? "md:pl-[92px]" : "md:pl-[92px] xl:pl-[280px]")}>
        {/* Top bar */}
        <header className="no-print sticky top-0 z-20 border-b border-neutral-200/60 bg-canvas/80 pt-[env(safe-area-inset-top)] backdrop-blur-md md:border-0 md:bg-transparent md:pt-0 md:backdrop-blur-none">
          <div className="flex h-14 items-center gap-1 px-4 md:h-[72px] md:gap-2 md:px-6">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] leading-4 text-neutral-500 md:text-[12px]">{context}{contextLabel && <span className="hidden text-neutral-400 md:inline"> · {contextLabel}</span>}</p>
              <p className="truncate text-[16px] leading-5 font-semibold text-neutral-900 md:text-base">{activeItem?.label ?? context}</p>
            </div>
            {searchBase && (
              <form data-tour="search" className="relative hidden w-72 lg:block" onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get("q");
                if (q) router.push(`${searchBase}?q=${encodeURIComponent(String(q))}`);
              }}>
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" />
                <input ref={searchRef} name="q" placeholder="Cari tugas, vendor, tamu" aria-label="Cari"
                  className="h-10 w-full rounded-full border border-neutral-200/80 bg-surface pr-16 pl-10 text-sm shadow-[0_1px_2px_rgba(62,26,45,0.04)] outline-none focus:border-plum-400 focus:ring-[3px] focus:ring-plum-100" />
                <kbd className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-neutral-200 bg-neutral-50 px-1.5 text-[10.5px] text-neutral-500">Ctrl K</kbd>
              </form>
            )}
            {searchBase && (
              <Link href={searchBase} aria-label="Cari" className="inline-flex size-10 items-center justify-center rounded-full text-neutral-700 hover:bg-surface lg:hidden"><Search className="size-5" /></Link>
            )}
            <button data-tour="help" onClick={() => { if (!startPageTour()) window.location.href = "mailto:halo@monaplan.id"; }} aria-label="Bantuan dan tur halaman" title="Tur halaman ini"
              className="inline-flex size-10 items-center justify-center rounded-full text-neutral-600 hover:bg-surface"><CircleHelp className="size-5" /></button>
            <span className="hidden sm:block"><ThemeToggle className="hover:bg-surface" /></span>
            {notifications && <NotificationBell notifications={notifications} />}
          </div>
        </header>

        <main className="flex-1 px-4 pt-2 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      {/* Navigasi bawah HP: menempel di tepi layar seperti aplikasi mobile */}
      <nav data-tour="mobile-nav" aria-label="Navigasi utama" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
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
                {item.label}
              </Link>
            );
          })}
          <button onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet}
            className={cn("flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-opacity active:opacity-60", menuActive ? "text-plum-700" : "text-neutral-500")}>
            <span className={cn("inline-flex h-7 w-14 items-center justify-center rounded-full transition-colors", menuActive && "bg-plum-100")}><Menu className="size-[22px]" strokeWidth={1.75} /></span>
            Menu
          </button>
        </div>
      </nav>
    </div>
  );
}

// Lembar menu penuh untuk HP: semua tujuan dalam grid ikon, kartu akses, tema, dan keluar
function MobileSheet({ groups, user, footer, isActive, onClose }: {
  groups: NavGroup[];
  user: ShellUser;
  footer?: ReactNode;
  isActive: (item: NavItem) => boolean;
  onClose: () => void;
}) {
  const links: { href: string; icon: IconKey; label: string }[] = [
    { href: "/mulai", icon: "home", label: "Ruang kerja" },
    { href: "/akun", icon: "user", label: "Profil & Lisensi" },
    { href: "/akun/tagihan", icon: "tagihan", label: "Tagihan" },
    ...(user.isAdmin ? [{ href: "/admin", icon: "admin" as const, label: "Panel Admin" }] : []),
  ];
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="animate-fade-in absolute inset-0 bg-[rgba(28,22,25,0.45)]" onClick={onClose} />
      <div className="animate-sheet-up absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border-t border-neutral-200/70 bg-surface shadow-modal">
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-neutral-300" aria-hidden="true" />
        <div className="flex items-center gap-3 px-5 pt-3 pb-4">
          <Avatar user={user} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-neutral-900">{user.name ?? user.email.split("@")[0]}</p>
            <p className="truncate text-xs text-neutral-500">{user.email}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup menu" className="inline-flex size-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"><X className="size-5" /></button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {groups.map((g) => (
            <section key={g.title} aria-label={g.title} className="mb-5">
              <h2 className="mb-2.5 text-[10.5px] font-semibold tracking-[0.12em] text-neutral-400 uppercase">{g.title}</h2>
              <ul className="grid grid-cols-4 gap-x-2 gap-y-3">
                {g.items.map((item) => {
                  const active = isActive(item);
                  const inner = (
                    <>
                      <span className={cn("relative inline-flex size-12 items-center justify-center rounded-2xl ring-1 transition-colors", active ? "bg-plum-100 text-plum-700 ring-plum-200" : "bg-neutral-50 text-neutral-600 ring-neutral-200/70")}>
                        <Icon name={item.icon} className="size-[22px]" />
                        {!!item.badge && <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-danger-solid px-1 text-center text-[10px] leading-4 font-semibold text-white">{item.badge}</span>}
                      </span>
                      <span className={cn("line-clamp-2 text-center text-[11.5px] leading-[14px] font-medium", active ? "text-plum-700" : "text-neutral-700")}>{item.label}</span>
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
            </section>
          ))}

          {footer && <div className="mb-5">{footer}</div>}

          <div className="mb-4 rounded-2xl bg-neutral-50 p-3">
            <p className="mb-2 text-[11px] font-medium text-neutral-500">Tema</p>
            <ThemeSwitcher compact />
          </div>

          <div className="flex flex-col">
            {links.map((l) => <MenuLink key={l.href} href={l.href} icon={l.icon} label={l.label} onClick={onClose} />)}
            <form action="/auth/signout" method="post">
              <button className="flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-[14px] font-medium text-danger hover:bg-danger-bg"><LogOut className="size-4" />Keluar</button>
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
  const [open, setOpen] = useState(false);
  useEscape(open, () => setOpen(false));
  return (
    <div className="relative w-full">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu akun"
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
              <p className="truncate text-[13px] font-semibold">{user.name ?? "Akun"}</p>
              <p className="truncate text-xs text-neutral-500">{user.email}</p>
            </div>
            <div className="py-1">
              <MenuLink href="/mulai" icon="home" label="Ruang kerja" onClick={() => setOpen(false)} />
              <MenuLink href="/akun" icon="user" label="Profil & Lisensi" onClick={() => setOpen(false)} />
              <MenuLink href="/akun/tagihan" icon="tagihan" label="Tagihan" onClick={() => setOpen(false)} />
              {user.isAdmin && <MenuLink href="/admin" icon="admin" label="Panel Admin" onClick={() => setOpen(false)} />}
            </div>
            <div className="border-t border-neutral-100 px-2 py-2">
              <p className="mb-1.5 px-1 text-[11px] font-medium text-neutral-500">Tema</p>
              <ThemeSwitcher compact />
            </div>
            <form action="/auth/signout" method="post" className="border-t border-neutral-100 pt-1">
              <button className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-danger hover:bg-danger-bg">
                <LogOut className="size-4" />Keluar
              </button>
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

function NotificationBell({ notifications }: { notifications: Notif[] }) {
  const [open, setOpen] = useState(false);
  useEscape(open, () => setOpen(false));
  const [, start] = useTransition();
  const unread = notifications.filter((n) => !n.read_at).length;
  return (
    <div className="relative">
      <button
        aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}
        onClick={() => {
          setOpen(!open);
          if (!open && unread) start(() => { markNotificationsRead(); });
        }}
        className="relative inline-flex size-10 items-center justify-center rounded-full text-neutral-600 hover:bg-surface"
      >
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute top-2 right-2.5 size-2 rounded-full bg-danger ring-2 ring-canvas" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 top-16 z-50 max-h-[70dvh] overflow-y-auto rounded-2xl border border-neutral-200 bg-surface p-2 shadow-pop md:absolute md:inset-x-auto md:top-auto md:right-0 md:mt-2 md:w-80">
            <p className="px-2 py-1.5 text-sm font-semibold">Notifikasi</p>
            {notifications.length === 0 && <p className="px-2 py-8 text-center text-[13px] text-neutral-500">Belum ada notifikasi.</p>}
            {notifications.map((n) => (
              <Link key={n.id} href={n.link_path ?? "#"} onClick={() => setOpen(false)} className={cn("block rounded-xl px-3 py-2.5 hover:bg-neutral-50", !n.read_at && "bg-plum-50")}>
                <span className="block text-[13px] font-medium text-neutral-800">{n.title}</span>
                {n.body && <span className="block text-xs text-neutral-500">{n.body}</span>}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
