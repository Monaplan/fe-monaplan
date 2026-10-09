"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { createBatch } from "@/features/admin/actions";

export function NewBatchButton({ plans }: { plans: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="dark" icon={<Plus />} onClick={() => setOpen(true)}>Batch Baru</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Batch Kode Baru" size="lg">
        <ActionForm action={createBatch} onSuccess={(r) => { setOpen(false); if (r.ok) router.push(`/admin/kode/${r.data.id}`); }}>
          <FormGrid>
            <Field label="Nama batch" htmlFor="b-name" className="sm:col-span-2"><Input id="b-name" name="name" required placeholder="Reseller Bandung Oktober" /></Field>
            <Field label="Channel" htmlFor="b-channel">
              <Select id="b-channel" name="channel" defaultValue="promo">
                {["reseller", "promo", "bonus", "offline", "kompensasi"].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Paket" htmlFor="b-plan">
              <Select id="b-plan" name="plan_id" required>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            </Field>
            <Field label="Jumlah kode" htmlFor="b-qty" help="Maksimal 10.000"><Input id="b-qty" type="number" min={1} max={10000} name="quantity" required defaultValue={10} /></Field>
            <Field label="Kuota pakai per kode" htmlFor="b-max"><Input id="b-max" type="number" min={1} name="max_redemptions_per_code" defaultValue={1} /></Field>
            <Field label="Berlaku sampai" htmlFor="b-until" help="Kosongkan bila tanpa batas"><Input id="b-until" type="date" name="valid_until" /></Field>
          </FormGrid>
          <Field label="Catatan" htmlFor="b-notes"><Textarea id="b-notes" name="notes" /></Field>
          <FormActions><Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button><SubmitButton>Buat Kode</SubmitButton></FormActions>
        </ActionForm>
      </Modal>
    </>
  );
}
