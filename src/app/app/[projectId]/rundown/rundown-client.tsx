"use client";

import { useState } from "react";
import { TimeField } from "@/components/ui/date-field";
import { ArrowDown, ArrowUp, CircleAlert, Download, MapPin, Pencil, Plus, Sparkles, Store, Trash2, UserRound } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionButton, ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { LinkTabs } from "@/components/ui/tabs";
import { StatusPill } from "@/components/ui/pill";
import { cn } from "@/components/ui/cn";
import { formatTime } from "@/lib/format";
import { applyRundownTemplate, deleteRundownItem, saveRundownItem, swapRundownOrder } from "@/features/rundown/actions";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useI18n } from "@/i18n/client";

type Item = { id: string; start_time: string; end_time: string | null; title: string; description: string | null; pic_name: string | null; location: string | null; vendor_id: string | null; vendors: { name: string } | null };
type Event = { id: string; name: string; type: string; starts_at: string | null; venue_name: string | null };

export function RundownClient({ projectId, tz, coupleName, events, active, items, vendors, canWrite }: {
  projectId: string; tz: string; coupleName?: string; events: Event[]; active: Event; items: Item[]; vendors: { id: string; name: string }[]; canWrite: boolean;
}) {
  const { t, lang } = useI18n();
  const [form, setForm] = useState<Item | "new" | null>(null);

  // RDN-04: deteksi jadwal bertabrakan
  const conflicts = new Set<string>();
  items.forEach((a, i) => items.slice(i + 1).forEach((b) => {
    const aEnd = a.end_time ?? a.start_time, bEnd = b.end_time ?? b.start_time;
    if (a.start_time < bEnd && b.start_time < aEnd) { conflicts.add(a.id); conflicts.add(b.id); }
  }));

  return (
    <>
      <ProductTour id="rundown" steps={TOURS["rundown"]!} />
      <div className="no-print">
        <PageHeader tour="rundown"
          title={t("Rundown Hari H")}
          description={t("Susunan acara dengan PIC dan lokasi.")}
          actions={
            <>
              {items.length > 0 && (
                <a className={buttonClass("outline")} href={`/api/export/${projectId}/rundown-pdf?acara=${active.id}`} download><Download />{t("Unduh PDF")}</a>
              )}
              {events.length > 1 && (
                <a className={buttonClass("ghost")} href={`/api/export/${projectId}/rundown-pdf?acara=semua`} download>{t("PDF semua acara")}</a>
              )}
              {canWrite && <Button variant="dark" icon={<Plus />} onClick={() => setForm("new")}>{t("Tambah Kegiatan")}</Button>}
            </>
          }
        />
        <LinkTabs className="mb-4" items={events.map((e) => ({ href: `?acara=${e.id}`, label: e.name, active: e.id === active.id }))} />
      </div>

      {conflicts.size > 0 && (
        <p className="no-print mb-3 flex items-center gap-2 rounded-lg bg-caution-bg px-4 py-3 text-[13px] text-caution">
          <CircleAlert className="size-4 shrink-0" />{" "}{t("Ada")}{" "}{conflicts.size}{" "}{t("kegiatan yang jamnya bertabrakan. Pastikan memang berjalan paralel.")}</p>
      )}

      {items.length === 0 ? (
        <Card tour="rundown-main">
          <EmptyState icon={<Sparkles />} title={t("Rundown masih kosong")} text={t("Mulai dari contoh, lalu ubah sesuai acaramu.")}
            action={canWrite && (
              <div className="flex flex-wrap justify-center gap-2">
                <ActionButton variant="primary" size="md" action={() => applyRundownTemplate(projectId, active.id, "akad")}>{t("Contoh Rundown Akad")}</ActionButton>
                <ActionButton variant="secondary" size="md" action={() => applyRundownTemplate(projectId, active.id, "resepsi")}>{t("Contoh Rundown Resepsi")}</ActionButton>
              </div>
            )} />
        </Card>
      ) : (
        <ol className="relative flex flex-col gap-3">
          {items.map((it, idx) => {
            const sameTimePrev = idx > 0 && items[idx - 1]!.start_time === it.start_time;
            const sameTimeNext = idx < items.length - 1 && items[idx + 1]!.start_time === it.start_time;
            return (
              <li key={it.id} data-row-id={it.id} className="grid grid-cols-[64px_1fr] gap-3 break-inside-avoid sm:grid-cols-[88px_1fr]">
                <div className="tabular pt-4 text-right">
                  <p className="text-sm font-semibold text-neutral-900">{formatTime(it.start_time, tz, undefined, lang)}</p>
                  {it.end_time && <p className="text-xs text-neutral-500">{formatTime(it.end_time, tz, undefined, lang)}</p>}
                </div>
                <div className={cn("rounded-lg border bg-surface p-4", conflicts.has(it.id) ? "border-[#D08A6C]" : "border-neutral-200")}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-800">{it.title}</p>
                      {it.description && <p className="mt-1 text-[13px] whitespace-pre-line text-neutral-600">{it.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-neutral-600">
                        {it.pic_name && <span className="flex items-center gap-1"><UserRound className="size-3.5" />{it.pic_name}</span>}
                        {it.location && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{it.location}</span>}
                        {it.vendors && <span className="flex items-center gap-1"><Store className="size-3.5" />{it.vendors.name}</span>}
                      </div>
                    </div>
                    {conflicts.has(it.id) && <StatusPill tone="caution">{t("Bertabrakan")}</StatusPill>}
                    {canWrite && (
                      <div className="no-print">
                        <RowMenu items={[
                          { label: t("Ubah"), icon: <Pencil />, onClick: () => setForm(it) },
                          { label: t("Naikkan"), icon: <ArrowUp />, hidden: !sameTimePrev, action: () => swapRundownOrder(projectId, it.id, items[idx - 1]!.id) },
                          { label: t("Turunkan"), icon: <ArrowDown />, hidden: !sameTimeNext, action: () => swapRundownOrder(projectId, it.id, items[idx + 1]!.id) },
                          { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus kegiatan ini?"), action: () => deleteRundownItem(projectId, it.id) },
                        ]} />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form === "new" ? t("Tambah Kegiatan") : t("Ubah Kegiatan")} size="lg">
        {form && (
          <ActionForm action={(fd) => saveRundownItem(projectId, fd)} onSuccess={() => setForm(null)}>
            <input type="hidden" name="event_id" value={active.id} />
            {form !== "new" && <input type="hidden" name="id" value={form.id} />}
            <FormGrid>
              <Field label={t("Jam mulai")} htmlFor="r-start"><TimeField id="r-start" name="start_time" required defaultValue={form !== "new" ? form.start_time.slice(0, 5) : ""} /></Field>
              <Field label={t("Jam selesai")} htmlFor="r-end"><TimeField id="r-end" name="end_time" defaultValue={form !== "new" ? form.end_time?.slice(0, 5) ?? "" : ""} /></Field>
            </FormGrid>
            <Field label={t("Kegiatan")} htmlFor="r-title"><Input id="r-title" name="title" required defaultValue={form !== "new" ? form.title : ""} /></Field>
            <Field label={t("Deskripsi")} htmlFor="r-desc"><Textarea id="r-desc" name="description" defaultValue={form !== "new" ? form.description ?? "" : ""} /></Field>
            <FormGrid>
              <Field label={t("PIC")} htmlFor="r-pic"><Input id="r-pic" name="pic_name" defaultValue={form !== "new" ? form.pic_name ?? "" : ""} /></Field>
              <Field label={t("Lokasi")} htmlFor="r-loc"><Input id="r-loc" name="location" defaultValue={form !== "new" ? form.location ?? "" : ""} /></Field>
              <Field label={t("Vendor terkait")} htmlFor="r-vendor" className="sm:col-span-2">
                <Select id="r-vendor" name="vendor_id" defaultValue={form !== "new" ? form.vendor_id ?? "" : ""}>
                  <option value="">{t("Tidak ada")}</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Select>
              </Field>
            </FormGrid>
            <FormActions><Button variant="secondary" onClick={() => setForm(null)}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>
    </>
  );
}
