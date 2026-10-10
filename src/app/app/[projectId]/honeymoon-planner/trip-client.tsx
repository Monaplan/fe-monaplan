"use client";

import { useMemo, useState, useTransition } from "react";
import { DateField, TimeField } from "@/components/ui/date-field";
import { BedDouble, Bus, CircleAlert, MapPin, MoreHorizontal, Pencil, Plane, Plus, Sparkles, Trash2, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { diffDays, formatDateCompact, formatDateLong, formatIDR } from "@/lib/format";
import { deleteTripItem, saveTripItem, saveTripPlan, setTripItemBooked } from "@/features/trip/actions";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useI18n } from "@/i18n/client";

type Plan = { destination: string | null; start_date: string | null; end_date: string | null; budget_idr: number; notes: string | null };
type Item = { id: string; day_date: string | null; start_time: string | null; kind: string; title: string; location: string | null; cost_idr: number; is_booked: boolean; notes: string | null };

const KINDS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "akomodasi", label: "Akomodasi", icon: BedDouble },
  { key: "transport", label: "Transportasi", icon: Bus },
  { key: "kegiatan", label: "Kegiatan", icon: Sparkles },
  { key: "makan", label: "Makan", icon: UtensilsCrossed },
  { key: "lainnya", label: "Lainnya", icon: MoreHorizontal },
];
const kind = (k: string) => KINDS.find((x) => x.key === k) ?? KINDS[KINDS.length - 1]!;
const addDay = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export function TripClient({ projectId, canWrite, weddingDate, plan, items }: { projectId: string; canWrite: boolean; weddingDate: string | null; plan: Plan | null; items: Item[] }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [planForm, setPlanForm] = useState(false);
  const [form, setForm] = useState<{ item: Item | null; day?: string } | null>(null);
  const [, start] = useTransition();

  const budget = Number(plan?.budget_idr ?? 0);
  const planned = items.reduce((s, i) => s + Number(i.cost_idr), 0);
  const booked = items.filter((i) => i.is_booked).reduce((s, i) => s + Number(i.cost_idr), 0);
  const over = budget > 0 && planned > budget;
  const nights = plan?.start_date && plan?.end_date ? diffDays(plan.start_date, plan.end_date) : null;
  const afterWedding = weddingDate && plan?.start_date ? diffDays(weddingDate, plan.start_date) : null;

  // Hari yang ditampilkan: semua hari dalam rentang (maks 21 hari) ditambah hari lain yang sudah punya butir
  const groups = useMemo(() => {
    const days = new Set<string>();
    if (plan?.start_date && plan?.end_date && diffDays(plan.start_date, plan.end_date) <= 20) for (let d = plan.start_date; d <= plan.end_date; d = addDay(d, 1)) days.add(d);
    for (const i of items) if (i.day_date) days.add(i.day_date);
    return [...days].sort().map((d) => ({ day: d, items: items.filter((i) => i.day_date === d) }));
  }, [plan, items]);
  const unscheduled = items.filter((i) => !i.day_date);

  const book = (i: Item, v: boolean) => start(async () => { const r = await setTripItemBooked(projectId, i.id, v); if (!r.ok) toast(r.error, "danger"); });

  const row = (i: Item) => {
    const k = kind(i.kind);
    return (
      <li key={i.id} data-row-id={i.id} className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-surface px-3.5 py-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-plum-100 text-plum-700 [&_svg]:size-[18px]" title={t(k.label)}><k.icon /></span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-neutral-900">
            <span className="truncate">{i.title}</span>
            {i.start_time && <span className="tabular text-xs font-normal text-neutral-500">{i.start_time.slice(0, 5)}</span>}
          </p>
          {(i.location || i.notes) && <p className="flex items-center gap-1 truncate text-xs text-neutral-500">{i.location && <><MapPin className="size-3 shrink-0" />{i.location}</>}{i.location && i.notes && " · "}{i.notes}</p>}
        </div>
        <span className="tabular hidden text-sm font-medium text-neutral-800 sm:block">{i.cost_idr > 0 ? formatIDR(Number(i.cost_idr)) : ""}</span>
        {canWrite ? (
          <Switch label={t("Sudah dipesan: {title}", { title: i.title })} checked={i.is_booked} onChange={(v) => book(i, v)} />
        ) : <StatusPill tone={i.is_booked ? "positive" : "neutral"}>{i.is_booked ? t("Dipesan") : t("Belum")}</StatusPill>}
        {canWrite && (
          <RowMenu items={[
            { label: t("Ubah"), icon: <Pencil />, onClick: () => setForm({ item: i }) },
            { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus butir ini?"), action: () => deleteTripItem(projectId, i.id) },
          ]} />
        )}
      </li>
    );
  };

  return (
    <>
      <ProductTour id="perjalanan" steps={TOURS["perjalanan"]!} />
      <PageHeader tour="perjalanan" title={t("Honeymoon Planner")} description={t("Susun tujuan, anggaran, dan rencana per hari untuk perjalanan setelah hari H.")}
        actions={canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" icon={<Pencil />} onClick={() => setPlanForm(true)}>{plan ? t("Ubah Rencana") : t("Atur Rencana")}</Button>
            <Button variant="dark" icon={<Plus />} onClick={() => setForm({ item: null })}>{t("Tambah Butir")}</Button>
          </div>
        )} />

      <Card tour="perjalanan-main" className="mb-4 overflow-hidden p-0 sm:p-0">
        <div className="brand-canvas relative px-5 py-6 text-white sm:px-7">
          <Plane aria-hidden="true" className="absolute top-5 right-6 size-16 -rotate-12 text-white/10" />
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/60 uppercase">{t("Tujuan")}</p>
          <p className="mt-1 font-display text-[34px] leading-10 font-medium">{plan?.destination ?? t("Belum ditentukan")}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/80">
            {plan?.start_date ? (
              <span>{formatDateLong(plan.start_date, undefined, lang)}{plan.end_date && ` – ${formatDateCompact(plan.end_date, undefined, lang)}`}</span>
            ) : <span>{t("Tanggal belum diisi")}</span>}
            {nights !== null && <span>· {t("{n} malam", { n: nights })}</span>}
            {afterWedding !== null && afterWedding >= 0 && <span>· {afterWedding === 0 ? t("Berangkat di hari H") : t("{n} hari setelah hari H", { n: afterWedding })}</span>}
          </p>
        </div>
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard title={t("Anggaran")} value={budget > 0 ? formatIDR(budget) : "–"} footer={budget > 0 ? <>{t("Sisa {v1}", { v1: formatIDR(Math.max(0, budget - planned)) })}</> : <>{t("Belum diatur")}</>} />
        <StatCard title={t("Biaya terencana")} value={formatIDR(planned)} footer={<>{t("{n} butir rencana", { n: items.length })}</>} />
        <Card>
          <h3 className="mb-2 text-[13px] font-medium text-neutral-600">{t("Sudah dipesan")}</h3>
          <p className="tabular text-[24px] leading-8 font-bold text-neutral-900 md:text-[28px] md:leading-9">{formatIDR(booked)}</p>
          <ProgressBar value={planned ? booked / planned : 0} className="mt-3" />
        </Card>
      </div>
      {over && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Biaya terencana melebihi anggaran sebesar {v1}.", { v1: formatIDR(planned - budget) })}
        </p>
      )}

      {items.length === 0 && groups.length === 0 ? (
        <Card>
          <EmptyState icon={<Plane />} title={t("Belum ada rencana perjalanan")} text={t("Atur tujuan dan tanggal, lalu tambahkan penginapan, transportasi, dan kegiatan per hari.")}
            action={canWrite && <div className="flex flex-wrap justify-center gap-2"><Button icon={<Pencil />} onClick={() => setPlanForm(true)}>{t("Atur Rencana")}</Button><Button variant="outline" icon={<Plus />} onClick={() => setForm({ item: null })}>{t("Tambah Butir")}</Button></div>} />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g, idx) => (
            <section key={g.day} aria-label={formatDateLong(g.day, undefined, lang)}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-neutral-900">
                  {plan?.start_date && <span className="mr-2 inline-flex h-6 items-center rounded-full bg-plum-600 px-2.5 text-[11px] font-semibold text-white">{t("Hari {n}", { n: diffDays(plan.start_date, g.day) + 1 })}</span>}
                  {!plan?.start_date && <span className="mr-2 text-plum-600">{idx + 1}</span>}
                  {formatDateLong(g.day, undefined, lang)}
                </h2>
                {canWrite && <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => setForm({ item: null, day: g.day })}>{t("Tambah")}</Button>}
              </div>
              {g.items.length ? <ul className="flex flex-col gap-2">{g.items.map(row)}</ul> : <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-3 text-[13px] text-neutral-500">{t("Belum ada rencana di hari ini.")}</p>}
            </section>
          ))}
          {unscheduled.length > 0 && (
            <section aria-label={t("Belum dijadwalkan")}>
              <h2 className="mb-2 text-sm font-semibold text-neutral-900">{t("Belum dijadwalkan")}</h2>
              <ul className="flex flex-col gap-2">{unscheduled.map(row)}</ul>
            </section>
          )}
        </div>
      )}

      {planForm && (
        <Modal open onClose={() => setPlanForm(false)} title={t("Rencana Perjalanan")} size="lg">
          <ActionForm action={(fd) => saveTripPlan(projectId, fd)} onSuccess={() => setPlanForm(false)}>
            <FormGrid>
              <Field label={t("Tujuan")} htmlFor="tp-dest" className="sm:col-span-2"><Input id="tp-dest" name="destination" maxLength={120} defaultValue={plan?.destination ?? ""} placeholder={t("Labuan Bajo")} /></Field>
              <Field label={t("Berangkat")} htmlFor="tp-start"><DateField id="tp-start" name="start_date" defaultValue={plan?.start_date ?? ""} /></Field>
              <Field label={t("Pulang")} htmlFor="tp-end"><DateField id="tp-end" name="end_date" defaultValue={plan?.end_date ?? ""} /></Field>
              <Field label={t("Anggaran")} htmlFor="tp-budget" className="sm:col-span-2"><CurrencyInput id="tp-budget" name="budget_idr" defaultValue={plan?.budget_idr} /></Field>
            </FormGrid>
            <Field label={t("Catatan")} htmlFor="tp-notes"><Textarea id="tp-notes" name="notes" maxLength={1000} defaultValue={plan?.notes ?? ""} /></Field>
            <FormActions><Button variant="secondary" onClick={() => setPlanForm(false)}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
          </ActionForm>
        </Modal>
      )}

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.item ? t("Ubah Butir") : t("Tambah Butir")} size="lg">
          <ActionForm action={(fd) => saveTripItem(projectId, fd)} onSuccess={() => setForm(null)}>
            {form.item && <input type="hidden" name="id" value={form.item.id} />}
            <FormGrid>
              <Field label={t("Judul")} htmlFor="ti-title" className="sm:col-span-2"><Input id="ti-title" name="title" required maxLength={120} defaultValue={form.item?.title} placeholder={t("Check-in hotel")} /></Field>
              <Field label={t("Jenis")} htmlFor="ti-kind">
                <Select id="ti-kind" name="kind" defaultValue={form.item?.kind ?? "kegiatan"}>{KINDS.map((k) => <option key={k.key} value={k.key}>{t(k.label)}</option>)}</Select>
              </Field>
              <Field label={t("Biaya")} htmlFor="ti-cost"><CurrencyInput id="ti-cost" name="cost_idr" defaultValue={form.item?.cost_idr} /></Field>
              <Field label={t("Tanggal")} htmlFor="ti-day" help={t("Kosongkan bila belum dijadwalkan.")}><DateField id="ti-day" name="day_date" min={plan?.start_date ?? undefined} max={plan?.end_date ?? undefined} defaultValue={form.item?.day_date ?? form.day ?? ""} /></Field>
              <Field label={t("Jam")} htmlFor="ti-time"><TimeField id="ti-time" name="start_time" defaultValue={form.item?.start_time?.slice(0, 5) ?? ""} /></Field>
              <Field label={t("Lokasi")} htmlFor="ti-loc" className="sm:col-span-2"><Input id="ti-loc" name="location" maxLength={160} defaultValue={form.item?.location ?? ""} /></Field>
            </FormGrid>
            <Field label={t("Catatan")} htmlFor="ti-notes"><Textarea id="ti-notes" name="notes" maxLength={500} defaultValue={form.item?.notes ?? ""} /></Field>
            <label className="flex items-center gap-2 text-[13px]"><Checkbox name="is_booked" defaultChecked={form.item?.is_booked} />{t("Sudah dipesan")}</label>
            <FormActions><Button variant="secondary" onClick={() => setForm(null)}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
