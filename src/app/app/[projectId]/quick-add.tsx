"use client";

import { useState } from "react";
import { DateField } from "@/components/ui/date-field";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, ListChecks, Plus, UserPlus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { PHASES } from "@/lib/constants";
import { saveTask } from "@/features/checklist/actions";
import { PaymentFormModal } from "@/features/budget/payment-form";
import { AgendaFormModal } from "@/features/agenda/agenda-form";
import { useProjectBase } from "@/components/app/project-base";
import { useT } from "@/i18n/client";

type Props = { projectId: string; tz: string; items: { id: string; name: string }[]; vendors: { id: string; name: string }[]; mode: "menu" | "countdown" };

export function QuickAdd({ projectId, tz, items, vendors, mode }: Props) {
  const t = useT();
  const base = useProjectBase();
  const router = useRouter();
  const [open, setOpen] = useState<"task" | "payment" | "agenda" | null>(null);
  const [menu, setMenu] = useState(false);

  return (
    <>
      {mode === "menu" ? (
        <div className="relative">
          <Button variant="dark" icon={<Plus />} onClick={() => setMenu(!menu)} aria-expanded={menu}>{t("Tambah")}{" "}<ChevronDown className="-mr-1 size-4" /></Button>
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-neutral-200 bg-surface p-1 shadow-pop">
                {[
                  { label: t("Tugas"), icon: <ListChecks />, on: () => setOpen("task") },
                  { label: t("Pembayaran"), icon: <Wallet />, on: () => setOpen("payment") },
                  { label: t("Tamu"), icon: <UserPlus />, on: () => router.push(`${base}/tamu`) },
                  { label: t("Agenda"), icon: <CalendarDays />, on: () => setOpen("agenda") },
                ].map((i) => (
                  <button key={i.label} onClick={() => { setMenu(false); i.on(); }} className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm hover:bg-neutral-100 [&_svg]:size-4 [&_svg]:text-neutral-500">
                    {i.icon}{i.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button icon={<Plus />} onClick={() => setOpen("task")}>{t("Tambah Tugas")}</Button>
          <Button variant="secondary" icon={<Wallet />} onClick={() => setOpen("payment")}>{t("Catat Pembayaran")}</Button>
        </div>
      )}

      <Modal open={open === "task"} onClose={() => setOpen(null)} title={t("Tambah Tugas")}>
        <ActionForm action={(fd) => saveTask(projectId, fd)} onSuccess={() => setOpen(null)}>
          <Field label={t("Judul")} htmlFor="qa-title"><Input id="qa-title" name="title" required autoFocus /></Field>
          <FormGrid>
            <Field label={t("Due date")} htmlFor="qa-due"><DateField id="qa-due" name="due_date" /></Field>
            <Field label={t("Fase")} htmlFor="qa-phase">
              <Select id="qa-phase" name="phase_key" defaultValue="m3_1">{PHASES.map((p) => <option key={p.key} value={p.key}>{t(p.label)}</option>)}</Select>
            </Field>
          </FormGrid>
          <input type="hidden" name="priority" value="medium" />
          <input type="hidden" name="status" value="todo" />
          <FormActions><Button variant="secondary" onClick={() => setOpen(null)}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
        </ActionForm>
      </Modal>
      {open === "payment" && <PaymentFormModal projectId={projectId} open onClose={() => setOpen(null)} items={items} vendors={vendors} />}
      {open === "agenda" && <AgendaFormModal projectId={projectId} tz={tz} onClose={() => setOpen(null)} />}
    </>
  );
}
