"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CircleAlert, MapPin, Pencil, Plus, Printer, Sparkles, Store, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionButton, ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { LinkTabs } from "@/components/ui/tabs";
import { StatusPill } from "@/components/ui/pill";
import { cn } from "@/components/ui/cn";
import { formatDateLong, formatTime } from "@/lib/format";
import { applyRundownTemplate, deleteRundownItem, saveRundownItem, swapRundownOrder } from "@/features/rundown/actions";

type Item = { id: string; start_time: string; end_time: string | null; title: string; description: string | null; pic_name: string | null; location: string | null; vendor_id: string | null; vendors: { name: string } | null };
type Event = { id: string; name: string; type: string; starts_at: string | null; venue_name: string | null };

export function RundownClient({ projectId, tz, coupleName, events, active, items, vendors, canWrite }: {
  projectId: string; tz: string; coupleName: string; events: Event[]; active: Event; items: Item[]; vendors: { id: string; name: string }[]; canWrite: boolean;
}) {
  const [form, setForm] = useState<Item | "new" | null>(null);

  // RDN-04: deteksi jadwal bertabrakan
  const conflicts = new Set<string>();
  items.forEach((a, i) => items.slice(i + 1).forEach((b) => {
    const aEnd = a.end_time ?? a.start_time, bEnd = b.end_time ?? b.start_time;
    if (a.start_time < bEnd && b.start_time < aEnd) { conflicts.add(a.id); conflicts.add(b.id); }
  }));

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Rundown Hari H"
          description="Susunan acara per sesi lengkap dengan PIC dan lokasi."
          actions={
            <>
              <Button variant="outline" icon={<Printer />} onClick={() => window.print()}>Cetak / PDF</Button>
              {canWrite && <Button variant="dark" icon={<Plus />} onClick={() => setForm("new")}>Tambah Kegiatan</Button>}
            </>
          }
        />
        <LinkTabs className="mb-4" items={events.map((e) => ({ href: `?acara=${e.id}`, label: e.name, active: e.id === active.id }))} />
      </div>

      <div className="mb-4 hidden print:block">
        <p className="text-sm">{coupleName}</p>
        <h1 className="text-2xl font-semibold">Rundown {active.name}</h1>
        <p className="text-sm">{active.starts_at && formatDateLong(active.starts_at, tz)}{active.venue_name && ` · ${active.venue_name}`}</p>
      </div>

      {conflicts.size > 0 && (
        <p className="no-print mb-3 flex items-center gap-2 rounded-lg bg-caution-bg px-4 py-3 text-[13px] text-caution">
          <CircleAlert className="size-4 shrink-0" /> Ada {conflicts.size} kegiatan yang jamnya bertabrakan. Pastikan memang berjalan paralel.
        </p>
      )}

      {items.length === 0 ? (
        <Card>
          <EmptyState icon={<Sparkles />} title="Rundown masih kosong" text="Mulai dari contoh rundown, lalu sesuaikan dengan acara kalian."
            action={canWrite && (
              <div className="flex flex-wrap justify-center gap-2">
                <ActionButton variant="primary" size="md" action={() => applyRundownTemplate(projectId, active.id, "akad")}>Contoh Rundown Akad</ActionButton>
                <ActionButton variant="secondary" size="md" action={() => applyRundownTemplate(projectId, active.id, "resepsi")}>Contoh Rundown Resepsi</ActionButton>
              </div>
            )} />
        </Card>
      ) : (
        <ol className="relative flex flex-col gap-3">
          {items.map((it, idx) => {
            const sameTimePrev = idx > 0 && items[idx - 1]!.start_time === it.start_time;
            const sameTimeNext = idx < items.length - 1 && items[idx + 1]!.start_time === it.start_time;
            return (
              <li key={it.id} className="grid grid-cols-[64px_1fr] gap-3 break-inside-avoid sm:grid-cols-[88px_1fr]">
                <div className="tabular pt-4 text-right">
                  <p className="text-sm font-semibold text-neutral-900">{formatTime(it.start_time, tz)}</p>
                  {it.end_time && <p className="text-xs text-neutral-500">{formatTime(it.end_time, tz)}</p>}
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
                    {conflicts.has(it.id) && <StatusPill tone="caution">Bertabrakan</StatusPill>}
                    {canWrite && (
                      <div className="no-print">
                        <RowMenu items={[
                          { label: "Ubah", icon: <Pencil />, onClick: () => setForm(it) },
                          { label: "Naikkan", icon: <ArrowUp />, hidden: !sameTimePrev, action: () => swapRundownOrder(projectId, it.id, items[idx - 1]!.id) },
                          { label: "Turunkan", icon: <ArrowDown />, hidden: !sameTimeNext, action: () => swapRundownOrder(projectId, it.id, items[idx + 1]!.id) },
                          { label: "Hapus", icon: <Trash2 />, danger: true, confirm: "Hapus kegiatan ini?", action: () => deleteRundownItem(projectId, it.id) },
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

      <Modal open={!!form} onClose={() => setForm(null)} title={form === "new" ? "Tambah Kegiatan" : "Ubah Kegiatan"} size="lg">
        {form && (
          <ActionForm action={(fd) => saveRundownItem(projectId, fd)} onSuccess={() => setForm(null)}>
            <input type="hidden" name="event_id" value={active.id} />
            {form !== "new" && <input type="hidden" name="id" value={form.id} />}
            <FormGrid>
              <Field label="Jam mulai" htmlFor="r-start"><Input id="r-start" type="time" name="start_time" required defaultValue={form !== "new" ? form.start_time.slice(0, 5) : ""} /></Field>
              <Field label="Jam selesai" htmlFor="r-end"><Input id="r-end" type="time" name="end_time" defaultValue={form !== "new" ? form.end_time?.slice(0, 5) ?? "" : ""} /></Field>
            </FormGrid>
            <Field label="Kegiatan" htmlFor="r-title"><Input id="r-title" name="title" required defaultValue={form !== "new" ? form.title : ""} /></Field>
            <Field label="Deskripsi" htmlFor="r-desc"><Textarea id="r-desc" name="description" defaultValue={form !== "new" ? form.description ?? "" : ""} /></Field>
            <FormGrid>
              <Field label="PIC" htmlFor="r-pic"><Input id="r-pic" name="pic_name" defaultValue={form !== "new" ? form.pic_name ?? "" : ""} /></Field>
              <Field label="Lokasi" htmlFor="r-loc"><Input id="r-loc" name="location" defaultValue={form !== "new" ? form.location ?? "" : ""} /></Field>
              <Field label="Vendor terkait" htmlFor="r-vendor" className="sm:col-span-2">
                <Select id="r-vendor" name="vendor_id" defaultValue={form !== "new" ? form.vendor_id ?? "" : ""}>
                  <option value="">Tidak ada</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Select>
              </Field>
            </FormGrid>
            <FormActions><Button variant="secondary" onClick={() => setForm(null)}>Batal</Button><SubmitButton>Simpan</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>
    </>
  );
}
