"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { createBatch } from "@/features/admin/actions";
import { useT } from "@/i18n/client";

export function NewBatchButton({ plans }: { plans: { id: string; name: string }[] }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="dark" icon={<Plus />} onClick={() => setOpen(true)}>{t("Batch Baru")}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("Batch Kode Baru")} size="lg">
        <ActionForm action={createBatch} onSuccess={(r) => { setOpen(false); if (r.ok) router.push(`/admin/kode/${r.data.id}`); }}>
          <FormGrid>
            <Field label={t("Nama batch")} htmlFor="b-name" className="sm:col-span-2"><Input id="b-name" name="name" required placeholder={t("Reseller Bandung Oktober")} /></Field>
            <Field label={t("Channel")} htmlFor="b-channel">
              <Select id="b-channel" name="channel" defaultValue="promo">
                {["reseller", "promo", "bonus", "offline", "kompensasi"].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label={t("Paket")} htmlFor="b-plan">
              <Select id="b-plan" name="plan_id" required>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            </Field>
            <Field label={t("Jumlah kode")} htmlFor="b-qty" help={t("Maksimal 10.000")}><Input id="b-qty" type="number" min={1} max={10000} name="quantity" required defaultValue={10} /></Field>
            <Field label={t("Kuota pakai per kode")} htmlFor="b-max"><Input id="b-max" type="number" min={1} name="max_redemptions_per_code" defaultValue={1} /></Field>
            <Field label={t("Berlaku sampai")} htmlFor="b-until" help={t("Kosongkan bila tanpa batas")}><Input id="b-until" type="date" name="valid_until" /></Field>
          </FormGrid>
          <Field label={t("Catatan")} htmlFor="b-notes"><Textarea id="b-notes" name="notes" /></Field>
          <FormActions><Button variant="secondary" onClick={() => setOpen(false)}>{t("Batal")}</Button><SubmitButton>{t("Buat Kode")}</SubmitButton></FormActions>
        </ActionForm>
      </Modal>
    </>
  );
}
