"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, FormGrid, Input, Textarea } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { StatusPill } from "@/components/ui/pill";
import { formatIDR } from "@/lib/format";
import { savePlan } from "@/features/admin/actions";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useT } from "@/i18n/client";

type Plan = { id: string; tier?: number; code: string; name: string; description: string | null; type: "lifetime" | "timed"; duration_days: number | null; price_idr: number; max_projects: number; max_collaborators: number; storage_quota_mb: number; is_public: boolean; is_active: boolean; sort_order: number };

export function PlansClient({ plans, sortControl }: { plans: Plan[]; sortControl?: React.ReactNode }) {
  const t = useT();
  const [form, setForm] = useState<Plan | "new" | null>(null);
  const p = form && form !== "new" ? form : null;

  return (
    <>
      <ProductTour id="admin-paket" steps={TOURS["admin-paket"]!} />
      <PageHeader tour="admin-paket" title={t("Paket")} description={t("Semua paket yang dijual berlaku selamanya. Masa uji coba diatur di menu Trial.")} actions={<>{sortControl}<Button variant="dark" icon={<Plus />} onClick={() => setForm("new")}>{t("Paket Baru")}</Button></>} />
      <Card tour="admin-paket-main" className="p-0 sm:p-0">
        {plans.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-neutral-200 px-5 py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{x.name} <span className="ml-1 text-xs text-neutral-500">{x.code}</span></p>
              <p className="text-xs text-neutral-500">{x.code === "TRIAL" ? t("Masa uji coba (lama diatur di menu Trial)") : x.type === "lifetime" ? t("Selamanya · Tier {v1}", { v1: x.tier ?? 1 }) : t("Lama, {duration_days} hari", { duration_days: x.duration_days })} · {x.max_projects}{" "}{t("proyek ·")}{" "}{x.max_collaborators}{" "}{t("kolaborator ·")}{" "}{x.storage_quota_mb}{" "}{t("MB")}</p>
            </div>
            <span className="tabular font-semibold">{formatIDR(x.price_idr)}</span>
            <StatusPill tone={x.is_active ? "positive" : "neutral"}>{x.is_active ? (x.is_public ? t("Aktif") : t("Aktif, tersembunyi")) : t("Nonaktif")}</StatusPill>
            <Button size="icon-sm" variant="secondary" aria-label={t("Ubah")} onClick={() => setForm(x)}><Pencil /></Button>
          </div>
        ))}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={p ? t("Ubah Paket") : t("Paket Baru")} size="lg">
        {form && (
          <ActionForm action={savePlan} onSuccess={() => setForm(null)}>
            {p && <input type="hidden" name="id" value={p.id} />}
            <FormGrid>
              <Field label={t("Kode")} htmlFor="pl-code"><Input id="pl-code" name="code" required defaultValue={p?.code} placeholder={t("LIFETIME")} /></Field>
              <Field label={t("Nama")} htmlFor="pl-name"><Input id="pl-name" name="name" required defaultValue={p?.name} /></Field>
              <input type="hidden" name="type" value={p?.type ?? "lifetime"} />
              {p?.type === "timed" && p.code !== "TRIAL" && <Field label={t("Durasi (hari)")} htmlFor="pl-dur"><Input id="pl-dur" type="number" min={1} name="duration_days" defaultValue={p.duration_days ?? 365} /></Field>}
              {p?.code === "TRIAL" && <input type="hidden" name="duration_days" value={p.duration_days ?? 3} />}
              <Field label={t("Harga")} htmlFor="pl-price"><CurrencyInput id="pl-price" name="price_idr" defaultValue={p?.price_idr} /></Field>
              <Field label={t("Batas proyek")} htmlFor="pl-proj"><Input id="pl-proj" type="number" min={1} name="max_projects" defaultValue={p?.max_projects ?? 1} /></Field>
              <Field label={t("Batas kolaborator")} htmlFor="pl-col"><Input id="pl-col" type="number" min={0} name="max_collaborators" defaultValue={p?.max_collaborators ?? 3} /></Field>
              <Field label={t("Kuota penyimpanan (MB)")} htmlFor="pl-sto"><Input id="pl-sto" type="number" min={1} name="storage_quota_mb" defaultValue={p?.storage_quota_mb ?? 50} /></Field>
              {p?.code === "TRIAL"
                ? <input type="hidden" name="tier" value={0} />
                : <Field label={t("Tingkat (tier)")} htmlFor="pl-tier" help={t("Angka lebih besar berarti paket lebih tinggi. Upgrade ke tier lebih tinggi hanya membayar selisih.")}><Input id="pl-tier" type="number" min={1} name="tier" defaultValue={p?.tier ?? 1} /></Field>}
              <Field label={t("Urutan")} htmlFor="pl-sort"><Input id="pl-sort" type="number" name="sort_order" defaultValue={p?.sort_order ?? 0} /></Field>
            </FormGrid>
            <Field label={t("Deskripsi")} htmlFor="pl-desc"><Textarea id="pl-desc" name="description" defaultValue={p?.description ?? ""} /></Field>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><Checkbox name="is_active" defaultChecked={p?.is_active ?? true} />{t("Aktif")}</label>
              <label className="flex items-center gap-2"><Checkbox name="is_public" defaultChecked={p?.is_public ?? true} />{t("Tampil di halaman aktivasi")}</label>
            </div>
            <FormActions><Button variant="secondary" onClick={() => setForm(null)}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>
    </>
  );
}
