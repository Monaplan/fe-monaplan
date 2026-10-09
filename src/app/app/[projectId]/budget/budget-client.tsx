"use client";

import { useState } from "react";
import { ChevronDown, CircleAlert, CircleCheck, Download, Pencil, PiggyBank, Plus, ReceiptText, Trash2, Wallet } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/components/ui/cn";
import { CategoryChart } from "@/components/app/charts";
import { PAYMENT_KIND, labelOf } from "@/lib/constants";
import { formatDateCompact, formatIDR, formatPercent, relativeDay, todayISO } from "@/lib/format";
import { deleteCategory, deleteItem, deletePayment, markPaymentPaid, saveCategory, saveItem } from "@/features/budget/actions";
import { PaymentFormModal, type Payment } from "@/features/budget/payment-form";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useI18n } from "@/i18n/client";

type Category = { id: string; name: string; allocated_idr: number };
type Item = { id: string; category_id: string; name: string; estimated_idr: number; actual_idr: number | null; vendor_id: string | null; notes: string | null; vendors: { name: string } | null };
type PaymentRow = Payment & { vendors: { name: string } | null; budget_items: { name: string } | null };

export function BudgetClient({ projectId, tz, totalBudget, categories, items, payments, vendors, documents, canWrite }: {
  projectId: string; tz: string; totalBudget: number; categories: Category[]; items: Item[]; payments: PaymentRow[];
  vendors: { id: string; name: string }[]; documents: { id: string; title: string }[]; canWrite: boolean;
}) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<"kategori" | "jadwal">("kategori");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [catForm, setCatForm] = useState<Category | "new" | null>(null);
  const [itemForm, setItemForm] = useState<{ item?: Item; categoryId?: string } | null>(null);
  const [payForm, setPayForm] = useState<{ payment?: Payment; itemId?: string } | null>(null);

  const today = todayISO(tz);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const estimated = sum(items.map((i) => i.estimated_idr));
  const actual = sum(items.map((i) => i.actual_idr ?? 0));
  const projected = sum(items.map((i) => i.actual_idr ?? i.estimated_idr));
  const paid = sum(payments.filter((p) => p.status === "sudah_bayar").map((p) => p.amount_idr));
  const unpaid = sum(payments.filter((p) => p.status === "belum_bayar").map((p) => p.amount_idr));
  const diff = totalBudget - projected;

  const catStats = categories.map((c) => {
    const its = items.filter((i) => i.category_id === c.id);
    return { ...c, items: its, estimated: sum(its.map((i) => i.estimated_idr)), actual: sum(its.map((i) => i.actual_idr ?? 0)) };
  });

  return (
    <>
      <ProductTour id="budget" steps={TOURS.budget} />
      <PageHeader
        title={t("Budgeting")}
        description={t("Alokasi, realisasi, dan jadwal pembayaran vendor.")}
        actions={
          <>
            <ButtonLink href={`/api/export/${projectId}/budget`} variant="outline" icon={<Download />} prefetch={false}>{t("Ekspor")}</ButtonLink>
            {canWrite && <Button data-tour="budget-pay" variant="dark" icon={<Plus />} onClick={() => setPayForm({})}>{t("Catat Pembayaran")}</Button>}
          </>
        }
      />

      <div data-tour="budget-stats" className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<PiggyBank />} title={t("Total Budget")} value={formatIDR(totalBudget)}
          footer={<StatusPill tone={diff < 0 ? "danger" : "positive"}>{diff < 0 ? t("Lebih {formatIDR}", { formatIDR: formatIDR(-diff) }) : t("Sisa {formatIDR}", { formatIDR: formatIDR(diff) })}</StatusPill>} />
        <StatCard icon={<Wallet />} title={t("Realisasi")} value={formatIDR(actual)}
          footer={<><StatusPill tone={actual > totalBudget ? "danger" : "positive"} icon={false}>{formatPercent(totalBudget ? actual / totalBudget : 0)}</StatusPill> estimasi {formatIDR(estimated)}</>} />
        <StatCard icon={<CircleCheck />} title={t("Sudah Dibayar")} value={formatIDR(paid)} footer={<>{t("{n} pembayaran", { n: payments.filter((p) => p.status === "sudah_bayar").length })}</>} />
        <StatCard icon={<ReceiptText />} title={t("Sisa Tagihan")} value={formatIDR(unpaid)} footer={<>{payments.filter((p) => p.status === "belum_bayar").length}{" "}{t("belum dibayar")}</>} />
      </div>

      {catStats.some((c) => c.estimated || c.actual) && (
        <Card className="mb-4">
          <CardHeader title={t("Estimasi dan Realisasi per Kategori")} />
          <CategoryChart data={catStats.filter((c) => c.estimated || c.actual).map((c) => ({ name: t(c.name), estimated: c.estimated, actual: c.actual }))} />
        </Card>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span data-tour="budget-tabs" className="inline-flex"><Segmented items={[{ key: "kategori", label: t("Kategori") }, { key: "jadwal", label: t("Jadwal Pembayaran") }]} value={tab} onChange={setTab} /></span>
        {canWrite && tab === "kategori" && <Button variant="outline" size="sm" icon={<Plus />} onClick={() => setCatForm("new")}>{t("Kategori")}</Button>}
      </div>

      {tab === "kategori" ? (
        <div className="flex flex-col gap-3">
          {catStats.map((c) => {
            const over = c.allocated_idr > 0 && c.actual > c.allocated_idr;
            const isOpen = open[c.id];
            return (
              <Card key={c.id} className="p-0 sm:p-0">
                <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setOpen({ ...open, [c.id]: !isOpen })} aria-expanded={!!isOpen}>
                    <ChevronDown className={cn("size-[18px] shrink-0 text-neutral-500 transition-transform", !isOpen && "-rotate-90")} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-neutral-800">{t(c.name)}</span>
                        <span className="text-xs text-neutral-500">{t("{length} item", { length: c.items.length })}</span>
                        {over && <StatusPill tone="danger">{t("Melebihi alokasi")}</StatusPill>}
                      </span>
                      <span className="mt-2 block max-w-md"><ProgressBar value={c.allocated_idr ? c.actual / c.allocated_idr : 0} /></span>
                    </span>
                    <span className="tabular text-right text-[13px]">
                      <span className="block font-semibold text-neutral-900">{formatIDR(c.actual)}</span>
                      <span className="text-neutral-500">{t("dari {v1}", { v1: formatIDR(c.allocated_idr) })}</span>
                    </span>
                  </button>
                  {canWrite && (
                    <RowMenu items={[
                      { label: t("Tambah item"), icon: <Plus />, onClick: () => setItemForm({ categoryId: c.id }) },
                      { label: t("Ubah kategori"), icon: <Pencil />, onClick: () => setCatForm(c) },
                      { label: t("Hapus kategori"), icon: <Trash2 />, danger: true, confirm: t("Hapus kategori {name} beserta itemnya?", { name: t(c.name) }), action: () => deleteCategory(projectId, c.id) },
                    ]} />
                  )}
                </div>
                {isOpen && (
                  <div className="border-t border-neutral-200">
                    <div className="hidden grid-cols-[1fr_140px_140px_140px_40px] gap-3 bg-neutral-50 px-5 py-2 text-xs font-medium text-neutral-500 md:grid">
                      <span>{t("Item")}</span><span className="text-right">{t("Estimasi")}</span><span className="text-right">{t("Realisasi")}</span><span className="text-right">{t("Dibayar")}</span><span />
                    </div>
                    {c.items.length === 0 && <p className="px-5 py-4 text-[13px] text-neutral-500">{t("Belum ada item.")}</p>}
                    {c.items.map((i) => {
                      const itemPaid = sum(payments.filter((p) => p.budget_item_id === i.id && p.status === "sudah_bayar").map((p) => p.amount_idr));
                      const menu = canWrite && (
                        <RowMenu items={[
                          { label: t("Ubah"), icon: <Pencil />, onClick: () => setItemForm({ item: i }) },
                          { label: t("Tambah pembayaran"), icon: <Plus />, onClick: () => setPayForm({ itemId: i.id }) },
                          { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus item ini?"), action: () => deleteItem(projectId, i.id) },
                        ]} />
                      );
                      return (
                        <div key={i.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-neutral-200 px-4 py-3 last:border-0 hover:bg-plum-50 sm:px-5 md:grid-cols-[1fr_140px_140px_140px_40px] md:items-center">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-800">{i.name}</p>
                            {i.vendors && <p className="text-xs text-neutral-500">{i.vendors.name}</p>}
                          </div>
                          <div className="col-start-2 row-start-1 md:hidden">{menu}</div>
                          <p className="tabular text-[13px] text-neutral-600 md:text-right"><span className="md:hidden">{t("Estimasi")}</span>{formatIDR(i.estimated_idr)}</p>
                          <p className="tabular text-[13px] font-semibold text-neutral-900 md:text-right"><span className="font-normal text-neutral-500 md:hidden">{t("Realisasi")}</span>{i.actual_idr != null ? formatIDR(i.actual_idr) : "-"}</p>
                          <p className="tabular text-[13px] text-neutral-600 md:text-right"><span className="md:hidden">{t("Dibayar")}</span>{formatIDR(itemPaid)}</p>
                          <div className="hidden md:block">{menu}</div>
                        </div>
                      );
                    })}
                    {canWrite && (
                      <button className="flex w-full items-center gap-2 px-5 py-3 text-[13px] font-medium text-plum-600 hover:bg-plum-50" onClick={() => setItemForm({ categoryId: c.id })}>
                        <Plus className="size-4" />{" "}{t("Tambah item")}</button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-0 sm:p-0">
          <div className="hidden grid-cols-[1.4fr_1fr_130px_140px_130px_40px] gap-3 rounded-t-lg bg-neutral-50 px-5 py-2.5 text-xs font-medium text-neutral-500 md:grid">
            <span>{t("Pembayaran")}</span><span>{t("Vendor")}</span><span>{t("Jatuh tempo")}</span><span className="text-right">{t("Nominal")}</span><span>{t("Status")}</span><span />
          </div>
          {payments.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">{t("Belum ada jadwal pembayaran.")}</p>}
          {payments.map((p) => {
            const late = p.status === "belum_bayar" && p.due_date && p.due_date < today;
            const soon = p.status === "belum_bayar" && p.due_date && !late && p.due_date <= addDays(today, 7);
            return (
              <div key={p.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-neutral-200 px-4 py-3 last:border-0 hover:bg-plum-50 sm:px-5 md:grid-cols-[1.4fr_1fr_130px_140px_130px_40px] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">{p.label ?? t(labelOf(PAYMENT_KIND, p.kind))}</p>
                  <p className="truncate text-xs text-neutral-500">{t(labelOf(PAYMENT_KIND, p.kind))}{p.budget_items ? ` · ${p.budget_items.name}` : ""}</p>
                </div>
                <p className="truncate text-[13px] text-neutral-600">{p.vendors?.name ?? "-"}</p>
                <p className="tabular text-[13px] text-neutral-600">{formatDateCompact(p.due_date, undefined, lang)}</p>
                <p className="tabular text-sm font-semibold text-neutral-900 md:text-right">{formatIDR(p.amount_idr)}</p>
                <div>
                  {p.status === "sudah_bayar" ? <StatusPill tone="positive">{t("Lunas")}</StatusPill>
                    : late ? <StatusPill tone="danger">{relativeDay(p.due_date, tz, lang)}</StatusPill>
                    : soon ? <StatusPill tone="caution">{relativeDay(p.due_date, tz, lang)}</StatusPill>
                    : <StatusPill tone="neutral">{t("Belum dibayar")}</StatusPill>}
                </div>
                <div className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto">
                  {canWrite && (
                    <RowMenu items={[
                      { label: t("Tandai lunas"), icon: <CircleCheck />, hidden: p.status === "sudah_bayar", action: () => markPaymentPaid(projectId, p.id) },
                      { label: t("Ubah"), icon: <Pencil />, onClick: () => setPayForm({ payment: p }) },
                      { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus pembayaran ini?"), action: () => deletePayment(projectId, p.id) },
                    ]} />
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {catStats.some((c) => c.allocated_idr > 0 && c.actual > c.allocated_idr) && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-danger-bg px-4 py-3 text-[13px] text-danger">
          <CircleAlert className="size-4 shrink-0" />{" "}{t("Ada kategori yang realisasinya melebihi alokasi. Cek kembali atau sesuaikan alokasinya.")}</p>
      )}

      <Modal open={!!catForm} onClose={() => setCatForm(null)} title={catForm === "new" ? t("Tambah Kategori") : t("Ubah Kategori")}>
        {catForm && (
          <ActionForm action={(fd) => saveCategory(projectId, fd)} onSuccess={() => setCatForm(null)}>
            {catForm !== "new" && <input type="hidden" name="id" value={catForm.id} />}
            <Field label={t("Nama kategori")} htmlFor="c-name"><Input id="c-name" name="name" required defaultValue={catForm !== "new" ? catForm.name : ""} /></Field>
            <Field label={t("Alokasi")} htmlFor="c-alloc"><CurrencyInput id="c-alloc" name="allocated_idr" defaultValue={catForm !== "new" ? catForm.allocated_idr : null} /></Field>
            <FormActions><Button variant="secondary" onClick={() => setCatForm(null)}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>

      <Modal open={!!itemForm} onClose={() => setItemForm(null)} title={itemForm?.item ? t("Ubah Item") : t("Tambah Item")}>
        {itemForm && (
          <ActionForm action={(fd) => saveItem(projectId, fd)} onSuccess={() => setItemForm(null)}>
            {itemForm.item && <input type="hidden" name="id" value={itemForm.item.id} />}
            <Field label={t("Kategori")} htmlFor="i-cat">
              <Select id="i-cat" name="category_id" defaultValue={itemForm.item?.category_id ?? itemForm.categoryId}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label={t("Nama item")} htmlFor="i-name"><Input id="i-name" name="name" required defaultValue={itemForm.item?.name} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Estimasi")} htmlFor="i-est"><CurrencyInput id="i-est" name="estimated_idr" defaultValue={itemForm.item?.estimated_idr} /></Field>
              <Field label={t("Realisasi (nilai deal)")} htmlFor="i-act"><CurrencyInput id="i-act" name="actual_idr" defaultValue={itemForm.item?.actual_idr} /></Field>
            </div>
            <Field label={t("Vendor terkait")} htmlFor="i-vendor">
              <Select id="i-vendor" name="vendor_id" defaultValue={itemForm.item?.vendor_id ?? ""}>
                <option value="">{t("Tidak ada")}</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
            <Field label={t("Catatan")} htmlFor="i-notes"><Textarea id="i-notes" name="notes" defaultValue={itemForm.item?.notes ?? ""} /></Field>
            <FormActions><Button variant="secondary" onClick={() => setItemForm(null)}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>

      {payForm && (
        <PaymentFormModal
          projectId={projectId}
          open
          onClose={() => setPayForm(null)}
          payment={payForm.payment}
          defaults={payForm.itemId ? { budget_item_id: payForm.itemId } : undefined}
          items={items}
          vendors={vendors}
          documents={documents}
        />
      )}
    </>
  );
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
