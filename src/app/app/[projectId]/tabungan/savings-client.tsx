"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Download, PiggyBank, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { Field, FormGrid, Input } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { DateField } from "@/components/ui/date-field";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { ProgressBar } from "@/components/ui/progress";
import { DepositChart } from "@/components/app/charts-lazy";
import { ProductTour } from "@/components/app/product-tour";
import { useProjectBase } from "@/components/app/project-base";
import { TOURS } from "@/content/tours";
import { deleteDeposit, saveDeposit, saveSavingsTarget } from "@/features/savings/actions";
import { useToast } from "@/components/ui/toast";
import { depositsByMonth, depositTotal, savingsPlan } from "@/lib/budget";
import { formatDateCompact, formatIDR, formatIDRShort } from "@/lib/format";
import { useI18n, useT } from "@/i18n/client";

type Deposit = { id: string; amount_idr: number; deposited_on: string; note: string | null };
type ItemLite = { id: string; estimated_idr: number; actual_idr: number | null };
type PaymentLite = { budget_item_id: string | null; amount_idr: number; status: string };

// Nominal ringkas saat kartu sempit (HP, dan empat kartu sejajar di laptop), lengkap saat lebar
const money = (n: number) => <><span className="sm:hidden lg:inline 2xl:hidden">{formatIDRShort(n)}</span><span className="hidden sm:inline lg:hidden 2xl:inline">{formatIDR(n)}</span></>;
const monthShort = (ym: string, lang: string) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${ym}-15T00:00:00Z`)).replace(".", "");

// Halaman Tabungan (DESIGN.md 21.1): target per bulan, progres, grafik setoran, dan riwayat setoran.
export function SavingsClient({ projectId, tz, weddingDate, today, canWrite, deposits, items, payments, target, deadline, targetSupported }: {
  projectId: string; tz: string; weddingDate: string | null; today: string; canWrite: boolean;
  deposits: Deposit[]; items: ItemLite[]; payments: PaymentLite[];
  // target dan batas buatan sendiri; targetSupported false bila migrasi 20261013000008 belum dijalankan (tombol atur disembunyikan)
  target: number | null; deadline: string | null; targetSupported: boolean;
}) {
  const t = useT();
  const { lang } = useI18n();
  const base = useProjectBase();
  const [form, setForm] = useState<Deposit | "new" | null>(null);
  const [targetOpen, setTargetOpen] = useState(false);

  const saved = depositTotal(deposits);
  const plan = savingsPlan({ items, payments, savings: saved, weddingDate, today, targetOverride: target, deadlineOverride: deadline });
  // Kebutuhan = sisa tagihan; progres dihitung terhadap kebutuhan total (sisa tagihan + yang sudah ditabung)
  const goal = plan.need;
  const progress = goal ? Math.min(1, saved / goal) : saved > 0 ? 1 : 0;
  const chart = useMemo(() => depositsByMonth(deposits, today).map((d) => ({ ...d, label: monthShort(d.month, lang), current: d.month === today.slice(0, 7) })), [deposits, today, lang]);
  const thisMonth = chart.find((c) => c.current)?.total ?? 0;

  return (
    <>
      <ProductTour id="tabungan" steps={TOURS["tabungan"]!} />
      <PageHeader tour="tabungan" title={t("Tabungan")} description={t("Catat setoran tabungan nikah dan pantau target per bulan sampai hari H.")}
        actions={<>
          {deposits.length > 0 && <ButtonLink href={`/api/export/${projectId}/tabungan`} variant="outline" icon={<Download />} prefetch={false}>{t("Ekspor")}</ButtonLink>}
          {canWrite && <Button variant="dark" icon={<Plus />} onClick={() => setForm("new")}>{t("Catat Setoran")}</Button>}
        </>} />

      <div data-tour="tabungan-stats" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard title={t("Terkumpul")} value={money(saved)} footer={t("{n} setoran", { n: deposits.length })} />
        <StatCard title={plan.manualTarget ? t("Target") : t("Sisa Tagihan")} value={money(goal)} footer={plan.manualTarget ? t("diatur sendiri") : t("belum dibayar vendor")} />
        <StatCard title={t("Kekurangan")} value={money(plan.shortfall)} footer={plan.shortfall ? t("yang masih perlu ditabung") : t("sudah tertutup")} />
        <StatCard title={t("Bulan ini")} value={money(thisMonth)} footer={t("disetor bulan ini")} />
      </div>

      <Card tour="tabungan-target" className="mb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-neutral-600"><PiggyBank className="size-4 text-plum-600" aria-hidden="true" />{t("Target Tabungan")}
              <span className="rounded-full bg-plum-100 px-2 py-0.5 text-[11px] font-semibold text-plum-700">{plan.manualTarget ? t("Diatur sendiri") : t("Otomatis")}</span></p>
            {!plan.deadline ? (
              <p className="mt-2 text-[14px] text-neutral-700">{t("Isi tanggal pernikahan untuk menghitung target.")}{" "}
                <a href={`${base}/pengaturan`} className="font-semibold text-plum-600 hover:underline">{t("Buka Pengaturan")}</a></p>
            ) : plan.shortfall === 0 ? (
              <>
                <p className="mt-1 text-[20px] leading-7 font-bold text-neutral-900">{t("Dana sudah cukup")}</p>
                <p className="mt-1 text-[13px] text-neutral-600">{t("Dana terkumpul menutup seluruh sisa tagihan.")}</p>
              </>
            ) : (
              <>
                <p className="tabular mt-1 text-[24px] leading-8 font-bold tracking-[-0.02em] text-neutral-900">{formatIDR(plan.perMonth)}<span className="text-[15px] font-semibold text-neutral-500"> / {t("bulan")}</span></p>
                <p className="mt-1 text-[13px] text-neutral-600">{plan.manualDeadline ? t("Selama {n} bulan, sampai {date}.", { n: plan.months ?? 1, date: formatDateCompact(plan.deadline, tz, lang) }) : t("Selama {n} bulan, sampai {date} (2 minggu sebelum hari H).", { n: plan.months ?? 1, date: formatDateCompact(plan.deadline, tz, lang) })}</p>
              </>
            )}
          </div>
          <div className="w-full md:max-w-[340px]">
            <div className="mb-2 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-neutral-600">{t("Dana terkumpul")}</span>
              <span className="tabular text-neutral-700"><b className="text-neutral-900">{formatIDRShort(saved)}</b> {t("dari {v1}", { v1: formatIDRShort(goal) })}</span>
            </div>
            <ProgressBar value={progress} />
            {canWrite && targetSupported && (
              <button type="button" onClick={() => setTargetOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-plum-600 hover:underline">
                <SlidersHorizontal className="size-3.5" aria-hidden="true" />{t("Atur target")}
              </button>
            )}
          </div>
        </div>
      </Card>

      {deposits.length === 0 ? (
        <Card>
          <EmptyState icon={<PiggyBank />} title={t("Belum ada setoran")} text={t("Catat setiap kali kalian menabung untuk pernikahan, supaya progres dan target per bulan selalu terbarui.")}
            action={canWrite && <Button icon={<Plus />} onClick={() => setForm("new")}>{t("Catat Setoran Pertama")}</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Card tour="tabungan-chart">
            <CardHeader title={t("Setoran per Bulan")} />
            <DepositChart data={chart} />
          </Card>
          <Card tour="tabungan-list" className="overflow-hidden p-0 sm:p-0">
            <p className="px-4 pt-4 pb-2 text-sm font-semibold text-neutral-800 sm:px-5">{t("Riwayat Setoran")}</p>
            <ul>
              {deposits.map((d) => (
                <li key={d.id} data-row-id={d.id} className="flex items-center gap-3 border-t border-neutral-100 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="tabular text-[15px] font-semibold text-neutral-900">{formatIDR(d.amount_idr)}</p>
                    <p className="truncate text-[12.5px] text-neutral-600">{formatDateCompact(d.deposited_on, tz, lang)}{d.note ? ` · ${d.note}` : ""}</p>
                  </div>
                  {canWrite && (
                    <RowMenu items={[
                      { label: t("Ubah"), icon: <Pencil />, onClick: () => setForm(d) },
                      { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus setoran ini?"), action: () => deleteDeposit(projectId, d.id) },
                    ]} />
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {targetOpen && <TargetForm projectId={projectId} target={target} deadline={deadline} autoNeed={plan.autoNeed} weddingDate={weddingDate} onClose={() => setTargetOpen(false)} />}
      {form && <DepositForm projectId={projectId} today={today} item={form === "new" ? null : form} onClose={() => setForm(null)} />}
    </>
  );
}

function DepositForm({ projectId, today, item, onClose }: { projectId: string; today: string; item: Deposit | null; onClose: () => void }) {
  const t = useT();
  const [round, setRound] = useState(0);
  const again = useRef(false);
  const amountRef = useRef<HTMLDivElement>(null);
  return (
    <Modal open onClose={onClose} title={item ? t("Ubah Setoran") : t("Catat Setoran")}>
      <ActionForm key={round} action={(fd) => saveDeposit(projectId, fd)}
        onSuccess={() => {
          if (!again.current) return onClose();
          again.current = false;
          setRound((n) => n + 1);
          setTimeout(() => amountRef.current?.querySelector("input")?.focus(), 50);
        }}>
        {item && <input type="hidden" name="id" value={item.id} />}
        <FormGrid>
          <Field label={t("Nominal")} htmlFor="sd-amount"><div ref={amountRef}><CurrencyInput id="sd-amount" name="amount_idr" required autoFocus defaultValue={item?.amount_idr} /></div></Field>
          <Field label={t("Tanggal setor")} htmlFor="sd-date"><DateField id="sd-date" name="deposited_on" defaultValue={item?.deposited_on ?? today} /></Field>
        </FormGrid>
        <Field label={t("Catatan")} htmlFor="sd-note"><Input id="sd-note" name="note" maxLength={300} defaultValue={item?.note ?? ""} placeholder={t("Contoh: gaji bulan ini")} /></Field>
        <FormActions>
          <Button variant="secondary" onClick={onClose}>{t("Batal")}</Button>
          {!item && <SubmitButton variant="outline" onClick={() => { again.current = true; }}>{t("Simpan & setor lagi")}</SubmitButton>}
          <SubmitButton onClick={() => { again.current = false; }}>{t("Simpan")}</SubmitButton>
        </FormActions>
      </ActionForm>
    </Modal>
  );
}

// Atur target sendiri: jumlah (kosong = sisa tagihan vendor) dan batas waktu (kosong = 2 minggu sebelum hari H)
function TargetForm({ projectId, target, deadline, autoNeed, weddingDate, onClose }: { projectId: string; target: number | null; deadline: string | null; autoNeed: number; weddingDate: string | null; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [pending, start] = useTransition();
  const reset = () => start(async () => {
    const r = await saveSavingsTarget(projectId, new FormData());
    toast(r.ok ? t(r.message ?? "Target tabungan tersimpan.") : t(r.error), r.ok ? "positive" : "danger");
    if (r.ok) onClose();
  });
  return (
    <Modal open onClose={onClose} title={t("Atur Target Tabungan")} description={t("Kosongkan isian untuk kembali ke hitungan otomatis.")}>
      <ActionForm action={(fd) => saveSavingsTarget(projectId, fd)} onSuccess={onClose}>
        <Field label={t("Jumlah target")} htmlFor="st-amount" help={t("Kosong = otomatis, sebesar sisa tagihan vendor ({v1}).", { v1: formatIDR(autoNeed) })}>
          <CurrencyInput id="st-amount" name="savings_target_idr" autoFocus defaultValue={target} />
        </Field>
        <Field label={t("Batas waktu menabung")} htmlFor="st-date" help={weddingDate ? t("Kosong = 2 minggu sebelum hari H.") : t("Kosong = tidak dihitung per bulan sampai tanggal pernikahan diisi.")}>
          <DateField id="st-date" name="savings_deadline" defaultValue={deadline ?? ""} />
        </Field>
        <FormActions>
          <Button variant="secondary" onClick={onClose}>{t("Batal")}</Button>
          {(target !== null || deadline !== null) && <Button variant="outline" loading={pending} onClick={reset}>{t("Pakai otomatis")}</Button>}
          <SubmitButton>{t("Simpan")}</SubmitButton>
        </FormActions>
      </ActionForm>
    </Modal>
  );
}
