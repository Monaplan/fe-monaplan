"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CalendarDays, CheckCheck, CreditCard, Mail, Sparkles, Wallet } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { fetchNotifications, markNotificationRead, markNotificationsRead } from "@/features/notifications/actions";
import { useI18n } from "@/i18n/client";

export type Notif = { id: string; type?: string; title: string; body: string | null; link_path: string | null; read_at: string | null; created_at: string };

const POLL_MS = 45_000;

function iconFor(type?: string) {
  if (type === "rsvp_response") return <Mail />;
  if (type?.startsWith("payment")) return <Wallet />;
  if (type?.startsWith("license")) return <CreditCard />;
  if (type === "agenda" || type === "task_due") return <CalendarDays />;
  return <Sparkles />;
}

function ago(iso: string, lang: "id" | "en", t: (s: string, v?: Record<string, string | number>) => string) {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return t("baru saja");
  if (s < 3600) return t("{n} menit lalu", { n: Math.floor(s / 60) });
  if (s < 86400) return t("{n} jam lalu", { n: Math.floor(s / 3600) });
  if (s < 7 * 86400) return t("{n} hari lalu", { n: Math.floor(s / 86400) });
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" }).format(new Date(iso));
}

// Lonceng notifikasi: masuk langsung lewat Realtime, polling 45 detik sebagai cadangan (hanya saat tab terlihat)
export function NotificationBell({ initial, userId }: { initial: Notif[]; userId: string }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<Notif[]>(initial);
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(false);
  const [, start] = useTransition();
  const seen = useRef(new Set(initial.map((n) => n.id)));
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unread = list.filter((n) => !n.read_at).length;

  // Sinkronkan bila server mengirim daftar baru (navigasi)
  useEffect(() => { setList(initial); initial.forEach((n) => seen.current.add(n.id)); }, [initial]);

  const incoming = useCallback((items: Notif[]) => {
    const fresh = items.filter((n) => !seen.current.has(n.id));
    if (!fresh.length) return;
    fresh.forEach((n) => seen.current.add(n.id));
    setList((cur) => [...fresh, ...cur.filter((c) => !fresh.some((f) => f.id === c.id))].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15));
    const top = fresh[0]!;
    toast(`${top.title}${top.body ? `: ${top.body}` : ""}`);
    setRing(true);
    setTimeout(() => setRing(false), 1500);
    // Lencana di sidebar (mis. Tamu & RSVP) ikut diperbarui; ditunda agar beberapa notifikasi beruntun hanya memicu satu penyegaran
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), 800);
  }, [toast, router]);

  useEffect(() => {
    // Klien Supabase (sekitar 65 KB) dimuat setelah halaman selesai tampil; sebelum itu notifikasi tetap diambil lewat polling
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const start = () => {
      import("@/lib/supabase/client").then(({ createClient }) => {
        if (cancelled) return;
        const supabase = createClient();
        const channel = supabase
          .channel(`notif:${userId}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
            const n = payload.new as Notif & { channel?: string };
            if (n.channel && n.channel !== "in_app") return;
            incoming([n]);
          })
          .subscribe();
        cleanup = () => { supabase.removeChannel(channel); };
      }).catch(() => {});
    };
    const idle = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: { timeout: number }) => number);
    const handle = idle ? idle(start, { timeout: 3000 }) : window.setTimeout(start, 1500);
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try { incoming((await fetchNotifications()) as Notif[]); } catch {}
    };
    const timer = setInterval(poll, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      cancelled = true;
      cleanup?.();
      if (idle) (window as any).cancelIdleCallback?.(handle); else clearTimeout(handle);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [userId, incoming]);

  // Jumlah belum dibaca di judul tab
  useEffect(() => {
    const clean = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = unread > 0 ? `(${unread > 9 ? "9+" : unread}) ${clean}` : clean;
  }, [unread]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const readOne = (n: Notif) => {
    setOpen(false);
    if (n.read_at) return;
    setList((cur) => cur.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    start(() => { markNotificationRead(n.id); });
  };
  const readAll = () => {
    setList((cur) => cur.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    start(() => { markNotificationsRead(); });
  };

  const fresh = list.filter((n) => !n.read_at);
  const older = list.filter((n) => n.read_at);
  const row = (n: Notif) => (
    <Link key={n.id} href={n.link_path ?? "#"} onClick={() => readOne(n)} className={cn("flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-neutral-50", !n.read_at && "bg-plum-50")}>
      <span className={cn("mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4", n.read_at ? "bg-neutral-100 text-neutral-500" : "bg-plum-100 text-plum-700")}>{iconFor(n.type)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-neutral-800">{n.title}</span>
        {n.body && <span className="block truncate text-xs text-neutral-600">{n.body}</span>}
        <span className="mt-0.5 block text-[11px] text-neutral-400">{ago(n.created_at, lang, t)}</span>
      </span>
      {!n.read_at && <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-plum-600" />}
    </Link>
  );

  return (
    <div className="relative">
      <button
        aria-label={unread ? t("Notifikasi, {n} belum dibaca", { n: unread }) : t("Notifikasi")}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative inline-flex size-10 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-surface"
      >
        {ring ? <BellRing className="animate-bell size-5 origin-top" /> : <Bell className="size-5" />}
        {unread > 0 && (
          <span className="tabular absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-4 font-bold text-white ring-2 ring-canvas">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-pop-in fixed inset-x-4 top-16 z-50 flex max-h-[70dvh] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-surface shadow-pop md:absolute md:inset-x-auto md:top-auto md:right-0 md:mt-2 md:w-96 md:origin-top-right">
            <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
              <p className="text-sm font-semibold">{t("Notifikasi")}</p>
              {unread > 0 && (
                <button onClick={readAll} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-plum-700 hover:bg-plum-50"><CheckCheck className="size-3.5" />{t("Tandai semua dibaca")}</button>
              )}
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto p-2 pt-0">
              {list.length === 0 && (
                <div className="flex flex-col items-center px-2 py-10 text-center">
                  <span className="mb-2 inline-flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400"><Bell className="size-5" /></span>
                  <p className="text-[13px] text-neutral-500">{t("Belum ada notifikasi.")}</p>
                </div>
              )}
              {fresh.length > 0 && <p className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">{t("Baru")}</p>}
              {fresh.map(row)}
              {older.length > 0 && <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">{t("Sebelumnya")}</p>}
              {older.map(row)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
