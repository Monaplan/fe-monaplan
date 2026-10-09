"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { StatusPill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { formatDateCompact, formatIDR, isoDateInTz } from "@/lib/format";
import { priceFor, promoIsLive, type Promo } from "@/lib/pricing";
import { deletePromo, savePromo, setFeatureEnabled, setPromoActive } from "@/features/admin/config-actions";

type PlanLite = { id: string; name: string; price_idr: number };

function status(p: Promo, masterOn: boolean) {
  const now = Date.now();
  if (!p.is_active) return { tone: "neutral" as const, label: "Nonaktif" };
  if (p.ends_at && Date.parse(p.ends_at) <= now) return { tone: "neutral" as const, label: "Berakhir" };
  if (p.starts_at && Date.parse(p.starts_at) > now) return { tone: "caution" as const, label: `Mulai ${formatDateCompact(p.starts_at)}` };
  return masterOn ? { tone: "positive" as const, label: "Berjalan" } : { tone: "caution" as const, label: "Tertahan, fitur promo mati" };
}

export function PromoClient({ enabled: initial, promos, plans, migrated }: { enabled: boolean; promos: Promo[]; plans: PlanLite[]; migrated: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [enabled, setEnabled] = useState(initial);
  const [form, setForm] = useState<Promo | "new" | null>(null);
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [pending, start] = useTransition();
  useEffect(() => setEnabled(initial), [initial]);
  const p = form && form !== "new" ? form : null;

  const run = (fn: () => ReturnType<typeof setFeatureEnabled>, undo?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) { toast(res.message ?? "Tersimpan."); router.refresh(); }
      else { undo?.(); toast(res.error, "danger"); }
    });

  return (
    <>
      <PageHeader title="Promo" description="Potongan harga otomatis untuk paket. Harga akhir dihitung di server dan dikirim ke Midtrans, jadi halaman bayar langsung menampilkan harga asli, potongan, dan total."
        actions={<Button variant="dark" icon={<Plus />} disabled={!migrated} onClick={() => { setType("percent"); setForm("new"); }}>Promo Baru</Button>} />

      {!migrated && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          Tabel promo belum ada di database. Jalankan migrasi 20261009000004_trial_promo_calendar.sql di Supabase SQL Editor, lalu muat ulang halaman ini.
        </p>
      )}

      <Card className="mb-4">
        <CardHeader icon={<Tag />} title="Fitur promo" subtitle="Saklar utama. Bila dimatikan, semua promo berhenti berlaku dan harga kembali normal."
          action={<Switch label="Aktifkan fitur promo" checked={enabled} disabled={pending || !migrated} onChange={(v) => { setEnabled(v); run(() => setFeatureEnabled("promo", v), () => setEnabled(!v)); }} />} />
        {plans.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {plans.map((pl) => {
              const priced = priceFor(pl, promos, enabled);
              return (
                <li key={pl.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                  <span className="text-[13px] font-medium text-neutral-800">{pl.name}</span>
                  <span className="tabular text-right text-sm">
                    {priced.promo ? (<><s className="mr-2 text-neutral-500">{formatIDR(priced.original)}</s><b>{formatIDR(priced.final)}</b></>) : <b>{formatIDR(priced.original)}</b>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-0 sm:p-0">
        {promos.length === 0 && <p className="px-5 py-10 text-center text-[13px] text-neutral-500">Belum ada promo. Buat promo pertama dengan tombol di kanan atas.</p>}
        {promos.map((x) => {
          const s = status(x, enabled);
          const plan = plans.find((pl) => pl.id === x.plan_id);
          return (
            <div key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-200 px-5 py-4 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-neutral-900">{x.name}</p>
                <p className="text-xs text-neutral-500">
                  {plan?.name ?? (x.plan_id ? "Paket lain" : "Semua paket")} · {x.starts_at ? formatDateCompact(x.starts_at) : "langsung"} sampai {x.ends_at ? formatDateCompact(x.ends_at) : "tanpa batas"}
                </p>
              </div>
              <span className="tabular text-lg font-semibold">{x.discount_type === "percent" ? `${x.discount_value}%` : formatIDR(x.discount_value)}</span>
              <StatusPill tone={s.tone}>{s.label}</StatusPill>
              <Switch label={`Aktifkan promo ${x.name}`} checked={x.is_active} disabled={pending} onChange={(v) => run(() => setPromoActive(x.id, v))} />
              <RowMenu items={[
                { label: "Ubah", icon: <Pencil />, onClick: () => { setType(x.discount_type); setForm(x); } },
                { label: "Hapus", icon: <Trash2 />, danger: true, confirm: `Hapus promo "${x.name}"?`, action: () => deletePromo(x.id) },
              ]} />
            </div>
          );
        })}
      </Card>
      {promos.some((x) => promoIsLive(x) && enabled) && (
        <p className="mt-3 text-xs text-neutral-500">Bila beberapa promo berlaku sekaligus, yang memberi potongan terbesar yang dipakai. Potongan tidak menurunkan harga di bawah Rp 1.000.</p>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={p ? "Ubah Promo" : "Promo Baru"} size="lg">
        {form && (
          <ActionForm action={savePromo} onSuccess={() => { setForm(null); router.refresh(); }}>
            {p && <input type="hidden" name="id" value={p.id} />}
            <Field label="Nama promo" htmlFor="pr-name"><Input id="pr-name" name="name" required defaultValue={p?.name} placeholder="Promo Akhir Tahun" /></Field>
            <FormGrid>
              <Field label="Jenis potongan" htmlFor="pr-type">
                <Select id="pr-type" name="discount_type" value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed")}>
                  <option value="percent">Persen (%)</option>
                  <option value="fixed">Nominal (Rp)</option>
                </Select>
              </Field>
              <Field label={type === "percent" ? "Besar potongan (%)" : "Besar potongan"} htmlFor="pr-val">
                {type === "percent"
                  ? <Input id="pr-val" name="discount_value" type="number" min={1} max={100} step={1} required defaultValue={p?.discount_type === "percent" ? p.discount_value : 20} />
                  : <CurrencyInput id="pr-val" name="discount_value" defaultValue={p?.discount_type === "fixed" ? p.discount_value : 50000} required />}
              </Field>
              <Field label="Berlaku untuk" htmlFor="pr-plan">
                <Select id="pr-plan" name="plan_id" defaultValue={p?.plan_id ?? ""}>
                  <option value="">Semua paket</option>
                  {plans.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                </Select>
              </Field>
              <span aria-hidden="true" className="hidden sm:block" />
              <Field label="Mulai" htmlFor="pr-from" help="Kosongkan agar langsung berlaku."><Input id="pr-from" name="starts_at" type="date" defaultValue={p?.starts_at ? isoDateInTz(p.starts_at, "Asia/Jakarta") : ""} /></Field>
              <Field label="Berakhir" htmlFor="pr-to" help="Kosongkan bila tanpa batas waktu."><Input id="pr-to" name="ends_at" type="date" defaultValue={p?.ends_at ? isoDateInTz(p.ends_at, "Asia/Jakarta") : ""} /></Field>
            </FormGrid>
            <Field label="Catatan" htmlFor="pr-desc" help="Hanya terlihat oleh admin."><Textarea id="pr-desc" name="description" defaultValue={p?.description ?? ""} /></Field>
            <label className="flex items-center gap-2 text-sm"><Checkbox name="is_active" defaultChecked={p?.is_active ?? true} />Aktif</label>
            <FormActions><Button variant="secondary" onClick={() => setForm(null)}>Batal</Button><SubmitButton>Simpan</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>
    </>
  );
}
