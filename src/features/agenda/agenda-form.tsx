"use client";

import { useState } from "react";
import { DateField, TimeField } from "@/components/ui/date-field";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormGrid, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { isoToLocalParts } from "@/lib/format";
import { saveAgenda } from "./actions";
import { useT } from "@/i18n/client";

export type Agenda = { id: string; title: string; description: string | null; location: string | null; starts_at: string; ends_at: string | null; all_day: boolean; remind_offsets_minutes: number[] };

const REMINDERS = [
  { v: 10080, label: "1 minggu sebelum" },
  { v: 1440, label: "1 hari sebelum" },
  { v: 60, label: "1 jam sebelum" },
  { v: 0, label: "Saat dimulai" },
];

export function AgendaFormModal({ projectId, tz, agenda, defaultDate, onClose }: { projectId: string; tz: string; agenda?: Agenda | null; defaultDate?: string; onClose: () => void }) {
  const t = useT();
  const start = isoToLocalParts(agenda?.starts_at, tz);
  const end = isoToLocalParts(agenda?.ends_at, tz);
  const [allDay, setAllDay] = useState(agenda?.all_day ?? false);
  const offsets = agenda?.remind_offsets_minutes ?? [1440, 60];
  return (
    <Modal open onClose={onClose} title={agenda ? t("Ubah Agenda") : t("Tambah Agenda")}>
      <ActionForm action={(fd) => saveAgenda(projectId, fd)} onSuccess={onClose}>
        {agenda && <input type="hidden" name="id" value={agenda.id} />}
        <Field label={t("Judul")} htmlFor="a-title"><Input id="a-title" name="title" required defaultValue={agenda?.title} placeholder={t("Fitting busana")} /></Field>
        <Field label={t("Tanggal")} htmlFor="a-date"><DateField id="a-date" name="date" required defaultValue={start.date || defaultDate} /></Field>
        <label className="flex items-center gap-2 text-sm"><Checkbox name="all_day" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />{t("Sepanjang hari")}</label>
        {!allDay && (
          <FormGrid>
            <Field label={t("Jam mulai")} htmlFor="a-start"><TimeField id="a-start" name="start_time" defaultValue={start.time || "09:00"} /></Field>
            <Field label={t("Jam selesai")} htmlFor="a-end"><TimeField id="a-end" name="end_time" defaultValue={end.time} /></Field>
          </FormGrid>
        )}
        <Field label={t("Lokasi")} htmlFor="a-loc"><Input id="a-loc" name="location" defaultValue={agenda?.location ?? ""} /></Field>
        <Field label={t("Catatan")} htmlFor="a-desc"><Textarea id="a-desc" name="description" defaultValue={agenda?.description ?? ""} /></Field>
        <Field label={t("Pengingat")}>
          <div className="flex flex-wrap gap-2">
            {REMINDERS.map((r) => (
              <label key={r.v} className="flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-[13px]">
                <Checkbox name="remind" value={r.v} defaultChecked={offsets.includes(r.v)} />{t(r.label)}
              </label>
            ))}
          </div>
        </Field>
        <FormActions><Button variant="secondary" onClick={onClose}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
      </ActionForm>
    </Modal>
  );
}
