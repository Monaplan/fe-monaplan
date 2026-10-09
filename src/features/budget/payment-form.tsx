"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { PAYMENT_KIND } from "@/lib/constants";
import { savePayment } from "./actions";
import { useT } from "@/i18n/client";

export type Payment = {
  id: string; budget_item_id: string | null; vendor_id: string | null; kind: string; label: string | null; amount_idr: number;
  due_date: string | null; status: "belum_bayar" | "sudah_bayar"; paid_at: string | null; payment_method: string | null;
  proof_document_id: string | null; notes: string | null;
};

export function PaymentFormModal({ projectId, open, onClose, payment, items, vendors, documents = [], defaults }: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  payment?: Payment | null;
  items: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  documents?: { id: string; title: string }[];
  defaults?: Partial<Payment>;
}) {
  const t = useT();
  const p = payment ?? (defaults as Payment | undefined);
  const [status, setStatus] = useState(p?.status ?? "belum_bayar");
  return (
    <Modal open={open} onClose={onClose} title={payment ? t("Ubah Pembayaran") : t("Catat Pembayaran")} size="lg">
      <ActionForm action={(fd) => savePayment(projectId, fd)} onSuccess={onClose}>
        {payment && <input type="hidden" name="id" value={payment.id} />}
        <FormGrid>
          <Field label={t("Item budget")} htmlFor="pay-item">
            <Select id="pay-item" name="budget_item_id" defaultValue={p?.budget_item_id ?? ""}>
              <option value="">{t("Tidak terhubung")}</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </Field>
          <Field label={t("Vendor")} htmlFor="pay-vendor">
            <Select id="pay-vendor" name="vendor_id" defaultValue={p?.vendor_id ?? ""}>
              <option value="">{t("Ikuti item / tidak ada")}</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label={t("Jenis")} htmlFor="pay-kind">
            <Select id="pay-kind" name="kind" defaultValue={p?.kind ?? "dp"}>
              {PAYMENT_KIND.map((k) => <option key={k.key} value={k.key}>{t(k.label)}</option>)}
            </Select>
          </Field>
          <Field label={t("Label")} htmlFor="pay-label"><Input id="pay-label" name="label" placeholder={t("DP 30% katering")} defaultValue={p?.label ?? ""} /></Field>
          <Field label={t("Nominal")} htmlFor="pay-amount"><CurrencyInput id="pay-amount" name="amount_idr" required defaultValue={p?.amount_idr} /></Field>
          <Field label={t("Jatuh tempo")} htmlFor="pay-due"><Input id="pay-due" type="date" name="due_date" defaultValue={p?.due_date ?? ""} /></Field>
          <Field label={t("Status")} htmlFor="pay-status">
            <Select id="pay-status" name="status" value={status} onChange={(e) => setStatus(e.target.value as Payment["status"])}>
              <option value="belum_bayar">{t("Belum dibayar")}</option>
              <option value="sudah_bayar">{t("Sudah dibayar")}</option>
            </Select>
          </Field>
          {status === "sudah_bayar" && (
            <Field label={t("Tanggal bayar")} htmlFor="pay-paid"><Input id="pay-paid" type="date" name="paid_at" defaultValue={p?.paid_at ?? ""} /></Field>
          )}
          <Field label={t("Metode")} htmlFor="pay-method"><Input id="pay-method" name="payment_method" placeholder={t("Transfer BCA")} defaultValue={p?.payment_method ?? ""} /></Field>
          {documents.length > 0 && (
            <Field label={t("Bukti bayar")} htmlFor="pay-proof">
              <Select id="pay-proof" name="proof_document_id" defaultValue={p?.proof_document_id ?? ""}>
                <option value="">{t("Belum ada")}</option>
                {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </Select>
            </Field>
          )}
        </FormGrid>
        <Field label={t("Catatan")} htmlFor="pay-notes"><Textarea id="pay-notes" name="notes" defaultValue={p?.notes ?? ""} /></Field>
        <FormActions>
          <Button variant="secondary" onClick={onClose}>{t("Batal")}</Button>
          <SubmitButton>{t("Simpan")}</SubmitButton>
        </FormActions>
      </ActionForm>
    </Modal>
  );
}
