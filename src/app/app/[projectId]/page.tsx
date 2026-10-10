import Link from "next/link";
import {
  ArrowDown, ArrowRight, ArrowUp, BookOpen, CalendarDays, FileText, Heart, ListChecks, MapPin, Target, Timer, Users, Wallet,
} from "lucide-react";
import { withProjectData } from "@/lib/access";
import { guideFrom } from "@/lib/guide";
import { Card, CardHeader, IconTile, StatCard } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/pill";
import { ProgressBar, ProgressRow } from "@/components/ui/progress";
import { cn } from "@/components/ui/cn";
import { SpendingChart } from "@/components/app/charts-lazy";
import { PHASES } from "@/lib/constants";
import {
  addDaysISO, diffDays, formatDateCompact, formatDateShort, formatIDR, formatIDRShort, formatPercent, formatTime,
  isoDateInTz, relativeDay, todayISO,
} from "@/lib/format";
import { QuickAdd } from "./quick-add";
import { CountdownHero } from "./countdown-hero";
import { CountUp } from "@/components/ui/count-up";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { getI18n } from "@/i18n/server";

const monthNames = (lang: "id" | "en") => Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, i, 15))));

export default async function DashboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { t, lang } = await getI18n();
  const { projectId: ref } = await params;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  // Data dashboard mulai diambil bersamaan dengan konteks proyek. Panduan dihitung dari data yang sama
  // (hanya empat query tambahan) sehingga tidak ada belasan query hitungan terpisah.
  const [{ project, canWrite, projectId }, d] = await withProjectData(ref, async (pid, supabase, tz) => {
    const today = todayISO(tz);
    const in14 = addDaysISO(today, 14);
    const head = { count: "exact" as const, head: true };
    const [tasks, items, payments, guests, docs, events, feed, vendors, allocated, templates, rundown, manual] = await Promise.all([
      supabase.from("tasks").select("phase_key, status").eq("project_id", pid),
      supabase.from("budget_items").select("id, name, actual_idr, estimated_idr").eq("project_id", pid),
      supabase.from("expense_payments").select("id, label, kind, amount_idr, due_date, status, paid_at, vendors(name)").eq("project_id", pid),
      supabase.from("guests").select("rsvp_status, pax_confirmed, rsvp_responded_at, invitation_sent_at").eq("project_id", pid),
      supabase.from("document_checklist_items").select("is_done").eq("project_id", pid),
      supabase.from("wedding_events").select("name, type, starts_at, venue_name").eq("project_id", pid).order("sort_order").order("starts_at"),
      supabase.from("calendar_feed").select("*").eq("project_id", pid).gte("starts_at", addDaysISO(today, -1)).lte("starts_at", addDaysISO(in14, 1)).order("starts_at"),
      supabase.from("vendors").select("id, name").eq("project_id", pid),
      supabase.from("budget_categories").select("*", head).eq("project_id", pid).gt("allocated_idr", 0),
      supabase.from("message_templates").select("created_at, updated_at").eq("project_id", pid),
      supabase.from("rundown_items").select("*", head).eq("project_id", pid),
      supabase.from("guide_progress").select("step_key").eq("project_id", pid),
    ]);
    return { today, in14, tasks: tasks.data, items: items.data, payments: payments.data, guests: guests.data, docs: docs.data, events: events.data, feed: feed.data, vendors: vendors.data, allocated: allocated.count ?? 0, templates: templates.data ?? [], rundown: rundown.count ?? 0, manual: (manual.data ?? []).map((m) => m.step_key as string) };
  });
  const { today, in14, tasks, items, payments, guests, docs, events, feed, vendors } = d;
  const tz = project.timezone;
  const guide = guideFrom(project, {
    events: (events ?? []).length, allocated: d.allocated, tasksDone: (tasks ?? []).filter((x) => x.status === "done").length, vendors: (vendors ?? []).length,
    guests: (guests ?? []).length, templates: d.templates, sent: (guests ?? []).filter((g) => g.invitation_sent_at).length, rundown: d.rundown,
    docAll: (docs ?? []).length, docDone: (docs ?? []).filter((x) => x.is_done).length, manual: d.manual,
  });

  // Hitung mundur
  const daysLeft = project.wedding_date ? diffDays(today, project.wedding_date) : null;
  const mainEvent = (events ?? []).find((e) => e.type === "resepsi") ?? (events ?? [])[0];

  // KPI
  const actual = (items ?? []).reduce((s, i) => s + (i.actual_idr ?? 0), 0);
  const budgetRatio = project.total_budget_idr ? actual / project.total_budget_idr : 0;
  const attending = (guests ?? []).filter((g) => g.rsvp_status === "hadir");
  const attendingPax = attending.reduce((s, g) => s + g.pax_confirmed, 0);
  const newPax = attending.filter((g) => g.rsvp_responded_at && g.rsvp_responded_at >= weekAgo).reduce((s, g) => s + g.pax_confirmed, 0);

  // Progress per fase: 4 fase mulai dari fase yang masih berjalan
  const phaseStats = PHASES.map((p) => {
    const list = (tasks ?? []).filter((t) => t.phase_key === p.key);
    return { ...p, total: list.length, done: list.filter((t) => t.status === "done").length };
  }).filter((p) => p.total > 0);
  const firstOpen = Math.max(0, phaseStats.findIndex((p) => p.done < p.total));
  const shownPhases = phaseStats.slice(Math.min(firstOpen, Math.max(0, phaseStats.length - 4)), Math.min(firstOpen, Math.max(0, phaseStats.length - 4)) + 4);

  // Target persiapan
  const tasksDone = (tasks ?? []).filter((t) => t.status === "done").length;
  const paid = (payments ?? []).filter((p) => p.status === "sudah_bayar").length;
  const docsDone = (docs ?? []).filter((d) => d.is_done).length;

  // Grafik pengeluaran tahun berjalan
  const year = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7)) - 1;
  const chart = monthNames(lang).map((m, i) => ({ month: m, actual: 0, estimated: 0, current: i === currentMonth }));
  (payments ?? []).forEach((p) => {
    if (p.status === "sudah_bayar" && p.paid_at && Number(p.paid_at.slice(0, 4)) === year) chart[Number(p.paid_at.slice(5, 7)) - 1]!.actual += p.amount_idr;
    if (p.due_date && Number(p.due_date.slice(0, 4)) === year) chart[Number(p.due_date.slice(5, 7)) - 1]!.estimated += p.amount_idr;
  });

  const upcoming = (payments ?? []).filter((p) => p.status === "belum_bayar").sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")).slice(0, 5);

  // Agenda 14 hari
  const agendaDays = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i)).map((d) => ({
    date: d,
    items: (feed ?? []).filter((f) => isoDateInTz(f.starts_at, tz) === d),
  })).filter((d) => d.items.length);

  const SRC: Record<string, React.ReactNode> = { task: <ListChecks />, expense_payment: <Wallet />, event: <Heart />, agenda: <CalendarDays /> };

  return (
    <>
      <ProductTour id="dashboard" steps={TOURS.dashboard} />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[22px] leading-[30px] font-semibold text-neutral-900 md:text-[28px] md:leading-9">{t("Halo,")}{" "}<span className="font-display text-[26px] font-medium text-plum-600 italic md:text-[28px]">{project.title}</span>
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">{t("Pantau semua persiapan menuju hari bahagia kalian.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-surface px-4 text-[13px] font-medium text-neutral-700">
            <CalendarDays className="size-4" />{formatDateShort(today, undefined, lang)}
          </span>
          {canWrite && <QuickAdd projectId={projectId} tz={tz} items={items ?? []} vendors={vendors ?? []} mode="menu" />}
        </div>
      </div>

      <div className="stagger grid gap-4 lg:grid-cols-12">
        <Card tour="countdown" className="lg:col-span-5 lg:row-span-2">
          <CountdownHero weddingDate={project.wedding_date} createdAt={project.created_at ?? new Date().toISOString()} today={today} tz={tz}
            place={mainEvent?.venue_name ?? project.city ?? null} settingsHref={`/app/${ref}/pengaturan?tab=budget`} />
          {canWrite && <div className="mt-4"><QuickAdd projectId={projectId} tz={tz} items={items ?? []} vendors={vendors ?? []} mode="countdown" /></div>}

          <div className="mt-6 mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-800">{t("Progress per Fase")}</h3>
            <Link href={`/app/${ref}/checklist`} className="inline-flex h-10 items-center rounded-full bg-neutral-100 px-3.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 md:h-8">{t("Semua")}</Link>
          </div>
          {shownPhases.length ? (
            <div className="grid grid-cols-2 gap-2">
              {shownPhases.map((p) => {
                const r = p.total ? p.done / p.total : 0;
                return (
                  <div key={p.key} className="rounded-[12px] bg-neutral-100 p-3">
                    <p className="text-xs font-medium text-neutral-600">{p.short}</p>
                    <p className="tabular mt-1 text-base font-semibold text-neutral-900">{formatPercent(r)}</p>
                    <ProgressBar value={r} className="mt-2 h-1.5" />
                    <p className="mt-1.5 text-[11px] text-neutral-600">{t("{done}/{total} tugas", { done: p.done, total: p.total })}</p>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-[13px] text-neutral-500">{t("Belum ada tugas di checklist.")}</p>}
        </Card>

        <StatCard tour="kpi" className="lg:col-span-4" icon={<Wallet />} title={t("Budget Terpakai")} value={<CountUp value={actual} kind="idr" />}
          footer={<><StatusPill tone={budgetRatio > 1 ? "danger" : "positive"} icon={budgetRatio > 1 ? <ArrowUp /> : false}>{formatPercent(budgetRatio)}</StatusPill>{t("dari total budget")}{" "}{formatIDRShort(project.total_budget_idr)}</>} />
        <StatCard className="lg:col-span-3" icon={<Users />} title={t("Tamu Hadir")} value={<><CountUp value={attendingPax} /> <span className="text-base font-medium text-neutral-500">{t("orang")}</span></>}
          footer={<><StatusPill tone="positive" icon={newPax ? <ArrowUp /> : <ArrowDown className="opacity-0" />}>+{newPax}</StatusPill>{t("minggu ini · {n} undangan", { n: attending.length })}</>} />

        <Card className="lg:col-span-7">
          <CardHeader title={t("Ringkasan Pengeluaran")} subtitle={t("Tahun {year}", { year })} />
          <SpendingChart data={chart} />
        </Card>

        <Card tour="target" className="lg:col-span-5">
          <CardHeader icon={<Target />} title={t("Target Persiapan")} />
          <div className="flex flex-col gap-5">
            <ProgressRow icon={<ListChecks />} title={t("Checklist")} done={tasksDone} total={(tasks ?? []).length} />
            <ProgressRow icon={<Wallet />} title={t("Pelunasan")} done={paid} total={(payments ?? []).length} />
            <ProgressRow icon={<FileText />} title={t("Dokumen")} done={docsDone} total={(docs ?? []).length} />
          </div>
          {guide.done < guide.total && (
            <Link href={`/app/${ref}/panduan`} className="mt-5 flex items-center gap-3 rounded-md bg-plum-50 p-3 hover:bg-plum-100">
              <IconTile className="border-plum-200 text-plum-700"><BookOpen /></IconTile>
              <span className="flex-1 text-[13px]"><b className="block text-neutral-800">{t("Panduan Penggunaan")}</b>{guide.done}/{guide.total}{" "}{t("langkah selesai")}</span>
              <ArrowRight className="size-4 text-plum-600" />
            </Link>
          )}
        </Card>

        <Card tour="payments" className="p-0 sm:p-0 lg:col-span-7">
          <div className="p-4 pb-0 sm:p-5 sm:pb-0">
            <CardHeader title={t("Pembayaran Mendatang")} action={<ButtonLink href={`/app/${ref}/budget`} variant="outline" size="sm">{t("Lihat semua")}</ButtonLink>} />
          </div>
          {upcoming.length === 0 ? (
            <p className="px-5 pb-6 text-[13px] text-neutral-500">{t("Tidak ada pembayaran yang belum lunas.")}</p>
          ) : (
            <>
              <div className="mx-5 hidden grid-cols-[1.4fr_1fr_1fr_110px] gap-3 rounded-md bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-500 md:grid">
                <span>{t("Vendor")}</span><span>{t("Jatuh tempo")}</span><span className="text-right">{t("Nominal")}</span><span>{t("Status")}</span>
              </div>
              <ul className="px-2 pb-2 md:px-5">
                {upcoming.map((p: any) => {
                  const late = p.due_date && p.due_date < today;
                  const soon = p.due_date && !late && p.due_date <= addDaysISO(today, 7);
                  return (
                    <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-neutral-200 px-3 py-3 last:border-0 md:grid-cols-[1.4fr_1fr_1fr_110px]">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-plum-100 text-plum-700"><Wallet className="size-3.5" /></span>
                        <span className="min-w-0"><span className="block truncate text-sm font-medium">{p.vendors?.name ?? p.label ?? t("Pembayaran")}</span><span className="block truncate text-xs text-neutral-500 md:hidden">{formatDateCompact(p.due_date, undefined, lang)}</span></span>
                      </div>
                      <span className="hidden text-[13px] text-neutral-600 md:block">{formatDateCompact(p.due_date, undefined, lang)}</span>
                      <span className="tabular text-right text-sm font-semibold">{formatIDR(p.amount_idr)}</span>
                      <span className="col-start-2 justify-self-end md:col-start-auto md:justify-self-start">
                        {late ? <StatusPill tone="danger">{relativeDay(p.due_date, tz, lang)}</StatusPill> : soon ? <StatusPill tone="caution">{relativeDay(p.due_date, tz, lang)}</StatusPill> : <StatusPill>{t("Belum")}</StatusPill>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        <Card className="lg:col-span-12">
          <CardHeader icon={<CalendarDays />} title={t("Agenda 14 Hari")} action={<ButtonLink href={`/app/${ref}/kalender`} variant="outline" size="sm">{t("Kalender")}</ButtonLink>} />
          {agendaDays.length === 0 ? <p className="text-[13px] text-neutral-500">{t("Tidak ada agenda dalam 14 hari ke depan.")}</p> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {agendaDays.slice(0, 8).map((d) => (
                <div key={d.date} className="flex gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3">
                  <div className={cn("w-12 shrink-0 rounded-md py-1.5 text-center", d.date === today ? "bg-plum-600 text-white" : "bg-neutral-100 text-neutral-700")}>
                    <p className="text-[10px] font-medium uppercase">{formatDateShort(d.date, undefined, lang).split(",")[0]}</p>
                    <p className="tabular text-base leading-5 font-semibold">{Number(d.date.slice(8))}</p>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-1">
                    {d.items.map((f: any) => (
                      <li key={f.source + f.source_id} className="flex items-start gap-2 text-[13px] leading-5">
                        <span className="mt-0.5 shrink-0 text-plum-600 [&_svg]:size-3.5">{SRC[f.source]}</span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("line-clamp-2 text-neutral-800", (f.status === "done" || f.status === "sudah_bayar") && "text-neutral-400 line-through")} title={f.title}>{f.title}</span>
                          {!f.all_day && <span className="tabular block text-xs text-neutral-500">{formatTime(f.starts_at, tz, undefined, lang)}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
