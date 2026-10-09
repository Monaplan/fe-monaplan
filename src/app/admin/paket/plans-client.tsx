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

type Plan = { id: string; code: string; name: string; description: string | null; type: "lifetime" | "timed"; duration_days: number | null; price_idr: number; max_projects: number; max_collaborators: number; storage_quota_mb: number; is_public: boolean; is_active: boolean; sort_order: number };

export function PlansClient({ plans }: { plans: Plan[] }) {
  const [form, setForm] = useState<Plan | "new" | null>(null);
  const p = form && form !== "new" ? form : null;

  return (
    <>
      <PageHeader title="Paket" description="Semua paket yang dijual berlaku selamanya. Masa uji coba diatur di menu Trial." actions={<Button variant="dark" icon={<Plus />} onClick={() => setForm("new")}>Paket Baru</Button>} />
      <Card className="p-0 sm:p-0">
        {plans.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-neutral-200 px-5 py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{x.name} <span className="ml-1 text-xs text-neutral-500">{x.code}</span></p>
              <p className="text-xs text-neutral-500">{x.code === "TRIAL" ? "Masa uji coba (lama diatur di menu Trial)" : x.type === "lifetime" ? "Selamanya" : `Lama, ${x.duration_days} hari`} · {x.max_projects} proyek · {x.max_collaborators} kolaborator · {x.storage_quota_mb} MB</p>
            </div>
            <span className="tabular font-semibold">{formatIDR(x.price_idr)}</span>
            <StatusPill tone={x.is_active ? "positive" : "neutral"}>{x.is_active ? (x.is_public ? "Aktif" : "Aktif, tersembunyi") : "Nonaktif"}</StatusPill>
            <Button size="icon-sm" variant="secondary" aria-label="Ubah" onClick={() => setForm(x)}><Pencil /></Button>
          </div>
        ))}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={p ? "Ubah Paket" : "Paket Baru"} size="lg">
        {form && (
          <ActionForm action={savePlan} onSuccess={() => setForm(null)}>
            {p && <input type="hidden" name="id" value={p.id} />}
            <FormGrid>
              <Field label="Kode" htmlFor="pl-code"><Input id="pl-code" name="code" required defaultValue={p?.code} placeholder="LIFETIME" /></Field>
              <Field label="Nama" htmlFor="pl-name"><Input id="pl-name" name="name" required defaultValue={p?.name} /></Field>
              <input type="hidden" name="type" value={p?.type ?? "lifetime"} />
              {p?.type === "timed" && p.code !== "TRIAL" && <Field label="Durasi (hari)" htmlFor="pl-dur"><Input id="pl-dur" type="number" min={1} name="duration_days" defaultValue={p.duration_days ?? 365} /></Field>}
              {p?.code === "TRIAL" && <input type="hidden" name="duration_days" value={p.duration_days ?? 3} />}
              <Field label="Harga" htmlFor="pl-price"><CurrencyInput id="pl-price" name="price_idr" defaultValue={p?.price_idr} /></Field>
              <Field label="Batas proyek" htmlFor="pl-proj"><Input id="pl-proj" type="number" min={1} name="max_projects" defaultValue={p?.max_projects ?? 1} /></Field>
              <Field label="Batas kolaborator" htmlFor="pl-col"><Input id="pl-col" type="number" min={0} name="max_collaborators" defaultValue={p?.max_collaborators ?? 3} /></Field>
              <Field label="Kuota penyimpanan (MB)" htmlFor="pl-sto"><Input id="pl-sto" type="number" min={1} name="storage_quota_mb" defaultValue={p?.storage_quota_mb ?? 500} /></Field>
              <Field label="Urutan" htmlFor="pl-sort"><Input id="pl-sort" type="number" name="sort_order" defaultValue={p?.sort_order ?? 0} /></Field>
            </FormGrid>
            <Field label="Deskripsi" htmlFor="pl-desc"><Textarea id="pl-desc" name="description" defaultValue={p?.description ?? ""} /></Field>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><Checkbox name="is_active" defaultChecked={p?.is_active ?? true} />Aktif</label>
              <label className="flex items-center gap-2"><Checkbox name="is_public" defaultChecked={p?.is_public ?? true} />Tampil di halaman aktivasi</label>
            </div>
            <FormActions><Button variant="secondary" onClick={() => setForm(null)}>Batal</Button><SubmitButton>Simpan</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>
    </>
  );
}
