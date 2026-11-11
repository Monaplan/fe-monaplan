import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Banknote, ChevronLeft, ChevronRight, CircleAlert, Download, HandCoins, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/pill";
import { CHANNEL_LABEL, EXPENSE_LABEL, deltaPct, isMonthKey, monthKeyOf, monthRange, shiftMonth, summarize, type Source, type ExpenseCategory } from "@/lib/finance";
import { loadLedger } from "@/lib/finance-data";
import { formatDateCompact, formatIDR } from "@/lib/format";
import { getI18n, getT } from "@/i18n/server";
import { DeleteExpenseButton, NewExpenseButton } from "./finance-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Keuangan") };
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const { t, lang } = await getI18n();
  await requireAdmin();
  const current = monthKeyOf(Date.now());
  const sp = (await searchParams).bulan;
  // Bulan di masa depan tidak punya data; dikembalikan ke bulan berjalan
  const bulan = isMonthKey(sp) && sp <= current ? sp : current;
  const prev = shiftMonth(bulan, -1), next = shiftMonth(bulan, 1);
  const range = monthRange(bulan);

  const { rows: all, missing } = await loadLedger(createAdminClient(), prev, bulan);
  const rows = all.filter((r) => r.date >= range.fromDate && r.date < range.toDate);
  const prevRows = all.filter((r) => r.date < range.fromDate);
  const sum = summarize(rows), before = summarize(prevRows);

  const label = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${bulan}-01T00:00:00Z`));
  const trend = (v: number | null) => v === null ? null : (
    <StatusPill tone={v >= 0 ? "positive" : "danger"} icon={v >= 0 ? <TrendingUp /> : <TrendingDown />}>{v >= 0 ? "+" : ""}{v}%</StatusPill>
  );
  const sourceName = (kind: "income" | "expense", s: string) => t(kind === "income" ? (CHANNEL_LABEL[s as Source] ?? s) : (EXPENSE_LABEL[s as ExpenseCategory] ?? s));
  const maxGross = Math.max(1, ...sum.bySource.map((b) => b.gross));

  return (
    <>
      <PageHeader
        title={t("Keuangan")}
        description={t("Pemasukan dari semua saluran (website, Lynk.id, WhatsApp, offline) dan pengeluaran, dalam satu buku kas.")}
        actions={
          <>
            <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-surface p-1">
              <Link href={`/admin/keuangan?bulan=${prev}`} aria-label={t("Bulan sebelumnya")} className={buttonClass("ghost", "icon-sm", "rounded-full")}><ChevronLeft /></Link>
              <span className="min-w-32 px-1 text-center text-[13px] font-semibold capitalize">{label}</span>
              {bulan < current
                ? <Link href={`/admin/keuangan?bulan=${next}`} aria-label={t("Bulan berikutnya")} className={buttonClass("ghost", "icon-sm", "rounded-full")}><ChevronRight /></Link>
                : <span aria-hidden="true" className={buttonClass("ghost", "icon-sm", "rounded-full pointer-events-none opacity-30")}><ChevronRight /></span>}
            </div>
            <ButtonLink href={`/api/admin/finance/csv?bulan=${bulan}`} prefetch={false} variant="outline" icon={<Download />}>{t("Ekspor CSV")}</ButtonLink>
            <NewExpenseButton disabled={missing} />
          </>
        }
      />

      {missing && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Tabel keuangan belum ada di database. Jalankan migrasi 20261111000001_sales_finance.sql di Supabase SQL Editor, lalu muat ulang halaman ini. Sementara itu hanya pesanan website yang tampil.")}
        </p>
      )}

      <div className="stagger mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Wallet />} title={t("Pendapatan kotor")} value={formatIDR(sum.gross)} footer={<>{trend(deltaPct(sum.gross, before.gross))}<span>{t("{n} transaksi", { n: sum.count })}</span></>} />
        <StatCard icon={<Receipt />} title={t("Biaya platform")} value={formatIDR(sum.fees)} footer={<span>{t("Potongan Lynk.id dan sejenisnya")}</span>} />
        <StatCard icon={<HandCoins />} title={t("Pengeluaran")} value={formatIDR(sum.expenses)} footer={<span>{t("Hosting, iklan, dan lainnya")}</span>} />
        <StatCard icon={<Banknote />} title={t("Laba bersih")} value={formatIDR(sum.profit)} footer={<>{trend(deltaPct(sum.profit, before.profit))}<span>{t("vs bulan lalu")}</span></>} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title={t("Pemasukan per saluran")} subtitle={formatIDR(sum.gross)} />
          {sum.bySource.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-neutral-500">{t("Belum ada pemasukan di bulan ini.")}</p>
          ) : (
            <ul className="space-y-4">
              {sum.bySource.map((b) => (
                <li key={b.source}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{t(CHANNEL_LABEL[b.source as Source] ?? b.source)}<span className="ml-2 text-xs font-normal text-neutral-500">{t("{n} transaksi", { n: b.count })}</span></span>
                    <span className="tabular font-semibold">{formatIDR(b.gross)}</span>
                  </div>
                  <ProgressBar value={b.gross / maxGross} />
                  {b.fee > 0 && <p className="tabular mt-1 text-xs text-neutral-500">{t("Biaya {v1} · bersih {v2}", { v1: formatIDR(b.fee), v2: formatIDR(b.gross - b.fee) })}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-0 sm:p-0 lg:col-span-3">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6"><CardHeader title={t("Buku kas")} subtitle={t("{n} catatan", { n: rows.length })} /></div>
          {rows.length === 0 ? (
            <p className="px-5 pb-8 text-center text-[13px] text-neutral-500">{t("Belum ada catatan di bulan ini.")}</p>
          ) : (
            <ul className="divide-y divide-neutral-200 border-t border-neutral-200">
              {rows.map((r) => {
                const income = r.kind === "income";
                return (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                    <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4 ${income ? "bg-positive-bg text-positive" : "bg-danger-bg text-danger"}`} aria-hidden="true">
                      {income ? <ArrowDownRight /> : <ArrowUpRight />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {r.href ? <Link href={r.href} className="block truncate text-sm font-medium hover:text-plum-700">{r.title}</Link> : <p className="truncate text-sm font-medium">{r.title}</p>}
                      <p className="truncate text-xs text-neutral-500">{[formatDateCompact(r.date, undefined, lang), sourceName(r.kind, r.source), r.sub].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="text-right">
                      <p className={`tabular text-sm font-semibold ${income ? "" : "text-danger"}`}>{income ? "" : "-"}{formatIDR(r.gross)}</p>
                      {r.fee > 0 && <p className="tabular text-xs text-neutral-500">{t("Bersih {v1}", { v1: formatIDR(r.net) })}</p>}
                    </div>
                    {!income && <DeleteExpenseButton id={r.id.slice(2)} title={r.title} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
