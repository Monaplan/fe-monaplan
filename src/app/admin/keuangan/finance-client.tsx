"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { DateField } from "@/components/ui/date-field";
import { Modal } from "@/components/ui/modal";
import { ActionButton, ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { deleteExpense, saveExpense } from "@/features/admin/sales-actions";
import { EXPENSE_CATEGORIES, EXPENSE_LABEL } from "@/lib/finance";
import { useI18n } from "@/i18n/client";

const todayWib = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

export function NewExpenseButton({ disabled }: { disabled?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="dark" icon={<Plus />} disabled={disabled} onClick={() => setOpen(true)}>{t("Catat Pengeluaran")}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("Catat Pengeluaran")}>
        {open && (
          <ActionForm action={saveExpense} onSuccess={(r) => { if (r.ok) { setOpen(false); router.refresh(); } }}>
            <FormGrid>
              <Field label={t("Kategori")} htmlFor="ex-cat">
                <Select id="ex-cat" name="category" defaultValue="hosting">{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(EXPENSE_LABEL[c])}</option>)}</Select>
              </Field>
              <Field label={t("Tanggal")} htmlFor="ex-date"><DateField id="ex-date" name="spent_on" required defaultValue={todayWib()} max={todayWib()} /></Field>
              <Field label={t("Jumlah (Rp)")} htmlFor="ex-amount"><Input id="ex-amount" name="amount_idr" required inputMode="numeric" /></Field>
              <Field label={t("Uraian")} htmlFor="ex-desc"><Input id="ex-desc" name="description" required maxLength={200} placeholder={t("Contoh: Vercel Pro bulan ini")} autoComplete="off" /></Field>
            </FormGrid>
            <FormActions><Button variant="secondary" onClick={() => setOpen(false)}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>
    </>
  );
}

export function DeleteExpenseButton({ id, title }: { id: string; title: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <ActionButton size="icon-sm" variant="ghost" title={t("Hapus")} icon={<Trash2 />} confirmText={t("Hapus pengeluaran {name}?", { name: title })}
      action={() => deleteExpense(id)} onSuccess={() => router.refresh()} />
  );
}
