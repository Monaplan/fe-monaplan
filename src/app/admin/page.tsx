import Link from "next/link";
import { AlertTriangle, BadgeCheck, Hourglass, KeyRound, ReceiptText, TrendingDown, TrendingUp, UserPlus, Users, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/pill";
import { formatDateCompact, formatIDR } from "@/lib/format";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { getI18n } from "@/i18n/server";
import { DonutChart, RevenueChart, SignupsChart } from "./dashboard-lazy";

const DAY = 86_400_000;
const monthNames = (lang: "id" | "en") => Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, i, 15))));
const ORDER_LABEL: Record<string, string> = { paid: "Lunas", pending: "Menunggu", failed: "Gagal", expired: "Kedaluwarsa", cancelled: "Dibatalkan", refunded: "Refund" };
const ORDER_TONE: Record<string, "positive" | "caution" | "danger" | "neutral"> = { paid: "positive", pending: "caution", failed: "danger", expired: "neutral", cancelled: "neutral", refunded: "caution" };
const SOURCES = ["payment", "access_code", "admin_grant", "trial"] as const;
const SOURCE_LABEL: Record<string, string> = { payment: "Dibayar", access_code: "Kode akses", admin_grant: "Diberikan admin", trial: "Trial" };

// Selisih persen terhadap periode sebelumnya; null bila pembanding nol
const delta = (now: number, prev: number) => (prev > 0 ? Math.round(((now - prev) / prev) * 100) : null);

export default async function AdminHome() {
  const { t, lang } = await getI18n();
  await requireAdmin();
  const admin = createAdminClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const d = new Date(now);
  const start12 = new Date(d.getFullYear(), d.getMonth() - 11, 1).toISOString();
  const since30 = new Date(now - 29 * DAY).toISOString();
  const soon = new Date(now + 14 * DAY).toISOString();
  const activeLic = (q: any) => q.eq("status", "active").lte("starts_at", nowIso).or(`ends_at.is.null,ends_at.gt.${nowIso}`);

  const [paid, signups, { count: usersTotal }, orders, bySource, trials, recentOrders, recentUsers, { count: review }, { count: expiring }, { data: batches }] = await Promise.all([
    admin.from("orders").select("amount_idr, paid_at").eq("status", "paid").gte("paid_at", start12).limit(10000),
    admin.from("profiles").select("created_at").gte("created_at", since30).limit(10000),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("orders").select("status").limit(20000),
    Promise.all(SOURCES.map((s) => activeLic(admin.from("licenses").select("*", { count: "exact", head: true }).eq("source", s)))),
    admin.from("licenses").select("user_id").eq("source", "trial").limit(5000),
    admin.from("orders").select("order_number, amount_idr, status, created_at, plans(name), profiles(email)").order("created_at", { ascending: false }).limit(6),
    admin.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }).limit(6),
    admin.from("orders").select("*", { count: "exact", head: true }).eq("needs_review", true),
    admin.from("licenses").select("*", { count: "exact", head: true }).eq("status", "active").gt("ends_at", nowIso).lte("ends_at", soon),
    admin.from("access_code_batches").select("id, name, quantity, access_codes(redemption_count)").order("created_at", { ascending: false }).limit(6),
  ]);

  // Pendapatan 12 bulan; bulan berjalan disorot
  const names = monthNames(lang);
  const months = Array.from({ length: 12 }, (_, i) => { const m = new Date(d.getFullYear(), d.getMonth() - 11 + i, 1); return { key: `${m.getFullYear()}-${m.getMonth()}`, label: names[m.getMonth()]!, value: 0, current: i === 11 }; });
  for (const o of paid.data ?? []) {
    const p = new Date(o.paid_at as string);
    const m = months.find((x) => x.key === `${p.getFullYear()}-${p.getMonth()}`);
    if (m) m.value += Number(o.amount_idr);
  }
  const revenue12 = months.reduce((s, m) => s + m.value, 0);
  const revThis = months[11]!.value, revPrev = months[10]!.value;
  const revDelta = delta(revThis, revPrev);

  // Pendaftaran 30 hari
  const days = Array.from({ length: 30 }, (_, i) => { const x = new Date(now - (29 - i) * DAY); return { key: x.toDateString(), label: `${x.getDate()}/${x.getMonth() + 1}`, value: 0 }; });
  for (const s of signups.data ?? []) {
    const dd = days.find((x) => x.key === new Date(s.created_at as string).toDateString());
    if (dd) dd.value += 1;
  }
  const signups7 = days.slice(-7).reduce((s, x) => s + x.value, 0);
  const signupsPrev7 = (signups.data ?? []).filter((s) => { const ts = Date.parse(s.created_at as string); return ts >= now - 14 * DAY && ts < now - 7 * DAY; }).length;

  const byStatus = (orders.data ?? []).reduce<Record<string, number>>((m, o) => ({ ...m, [o.status as string]: (m[o.status as string] ?? 0) + 1 }), {});
  const orderDonut = Object.entries(byStatus).map(([k, v]) => ({ name: t(ORDER_LABEL[k] ?? k), value: v }));
  const sourceCounts = SOURCES.map((s, i) => ({ name: t(SOURCE_LABEL[s]!), value: bySource[i]!.count ?? 0 }));
  const licActive = sourceCounts.reduce((s, x) => s + x.value, 0);

  // Konversi trial: dari pengguna yang pernah trial, berapa yang kini punya lisensi non-trial
  const trialUsers = [...new Set((trials.data ?? []).map((r) => r.user_id as string))];
  let converted = 0;
  if (trialUsers.length) {
    const { data: conv } = await admin.from("licenses").select("user_id").neq("source", "trial").in("user_id", trialUsers.slice(0, 1000));
    converted = new Set((conv ?? []).map((r) => r.user_id as string)).size;
  }
  const trialTotal = Math.min(trialUsers.length, 1000);
  const convRate = trialTotal ? converted / trialTotal : 0;

  const attention = [
    { show: (review ?? 0) > 0, icon: <AlertTriangle />, text: t("{n} order perlu ditinjau", { n: review ?? 0 }), href: "/admin/order?review=1", tone: "danger" as const },
    { show: (expiring ?? 0) > 0, icon: <Hourglass />, text: t("{n} lisensi berakhir dalam 14 hari", { n: expiring ?? 0 }), href: "/admin/lisensi", tone: "caution" as const },
  ].filter((a) => a.show);

  const trend = (v: number | null) => v === null ? null : (
    <StatusPill tone={v >= 0 ? "positive" : "danger"} icon={v >= 0 ? <TrendingUp /> : <TrendingDown />}>{v >= 0 ? "+" : ""}{v}%</StatusPill>
  );

  return (
    <>
      <ProductTour id="admin" steps={TOURS["admin"]!} />
      <PageHeader tour="admin" title={t("Dashboard")} description={t("Pendapatan, pengguna, dan hal yang perlu ditindaklanjuti.")} />

      {attention.length > 0 && (
        <ul className="stagger mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {attention.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="hover-lift flex items-center gap-3 rounded-xl border border-neutral-200 bg-surface px-4 py-3 text-[13px] font-medium text-neutral-800">
                <span className={a.tone === "danger" ? "text-danger [&_svg]:size-4" : "text-caution [&_svg]:size-4"}>{a.icon}</span>{a.text}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="stagger mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Wallet />} title={t("Pendapatan bulan ini")} value={formatIDR(revThis)} footer={<>{trend(revDelta)}<span>{t("12 bulan {v1}", { v1: formatIDR(revenue12) })}</span></>} />
        <StatCard icon={<Users />} title={t("Pengguna")} value={usersTotal ?? 0} footer={<>{trend(delta(signups7, signupsPrev7))}<span>{t("{n} baru 7 hari", { n: signups7 })}</span></>} />
        <StatCard icon={<BadgeCheck />} title={t("Lisensi Aktif")} value={licActive} footer={<span>{t("{n} sedang trial", { n: sourceCounts[3]!.value })}</span>} />
        <StatCard icon={<ReceiptText />} title={t("Order Lunas")} value={byStatus.paid ?? 0} footer={<span>{t("{v1} menunggu · {v2} kedaluwarsa", { v1: byStatus.pending ?? 0, v2: byStatus.expired ?? 0 })}</span>} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card tour="admin-main" className="lg:col-span-3">
          <CardHeader title={t("Pendapatan 12 bulan")} subtitle={formatIDR(revenue12)} />
          <RevenueChart data={months} />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader icon={<UserPlus />} title={t("Pendaftaran 30 hari")} subtitle={t("{n} pengguna baru", { n: days.reduce((s, x) => s + x.value, 0) })} />
          <SignupsChart data={days} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t("Order per Status")} />
          {orderDonut.length ? <DonutChart data={orderDonut} centerLabel={t("order")} ariaLabel={t("Grafik order per status")} /> : <p className="py-8 text-center text-[13px] text-neutral-500">{t("Belum ada order.")}</p>}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title={t("Sumber Lisensi Aktif")} />
          {licActive ? <DonutChart data={sourceCounts.filter((x) => x.value > 0)} centerLabel={t("lisensi")} ariaLabel={t("Grafik sumber lisensi aktif")} /> : <p className="py-8 text-center text-[13px] text-neutral-500">{t("Belum ada lisensi aktif.")}</p>}
        </Card>
        <Card>
          <CardHeader title={t("Konversi Trial")} />
          <p className="tabular text-[34px] leading-10 font-bold text-neutral-900">{Math.round(convRate * 100)}%</p>
          <p className="mt-1 text-[13px] text-neutral-600">{t("{a} dari {b} pengguna trial kini punya akses berbayar atau kode.", { a: converted, b: trialTotal })}</p>
          <ProgressBar value={convRate} className="mt-3" />
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader icon={<ReceiptText />} title={t("Order Terbaru")} action={<Link href="/admin/order" className="text-[13px] font-medium text-plum-700 hover:underline">{t("Lihat semua")}</Link>} />
          {(recentOrders.data ?? []).length === 0 ? <p className="py-6 text-center text-[13px] text-neutral-500">{t("Belum ada order.")}</p> : (
            <ul className="divide-y divide-neutral-200">
              {(recentOrders.data ?? []).map((o: any) => (
                <li key={o.order_number} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{o.profiles?.email ?? "-"}</p>
                    <p className="text-xs text-neutral-500">{o.plans?.name} · {formatDateCompact(o.created_at, undefined, lang)}</p>
                  </div>
                  <span className="tabular text-sm font-semibold">{formatIDR(Number(o.amount_idr))}</span>
                  <StatusPill tone={ORDER_TONE[o.status] ?? "neutral"}>{t(ORDER_LABEL[o.status] ?? o.status)}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader icon={<Users />} title={t("Pengguna Terbaru")} action={<Link href="/admin/pengguna" className="text-[13px] font-medium text-plum-700 hover:underline">{t("Lihat semua")}</Link>} />
          <ul className="divide-y divide-neutral-200">
            {(recentUsers.data ?? []).map((u: any) => (
              <li key={u.id} className="py-2.5">
                <p className="truncate text-sm font-medium">{u.full_name ?? u.email}</p>
                <p className="truncate text-xs text-neutral-500">{u.email} · {formatDateCompact(u.created_at, undefined, lang)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader icon={<KeyRound />} title={t("Kode Tertebus per Batch")} action={<Link href="/admin/kode" className="text-[13px] font-medium text-plum-700 hover:underline">{t("Kelola kode")}</Link>} />
          <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {(batches ?? []).map((b: any) => {
              const used = (b.access_codes ?? []).reduce((s: number, c: any) => s + c.redemption_count, 0);
              return (
                <li key={b.id}>
                  <div className="mb-1 flex justify-between text-sm"><Link href={`/admin/kode/${b.id}`} className="font-medium hover:text-plum-700">{b.name}</Link><span className="tabular text-neutral-600">{used}/{b.quantity}</span></div>
                  <ProgressBar value={b.quantity ? used / b.quantity : 0} />
                </li>
              );
            })}
            {!batches?.length && <li className="text-sm text-neutral-500">{t("Belum ada batch.")}</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
