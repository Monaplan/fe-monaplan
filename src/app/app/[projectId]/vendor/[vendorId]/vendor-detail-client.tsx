"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, AtSign, CircleCheck, FileText, Globe, Handshake, Mail, MapPin, MessageCircle, Package, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/pill";
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/components/ui/cn";
import { useProjectBase } from "@/components/app/project-base";
import { DOCUMENT_CATEGORY, PAYMENT_KIND, VENDOR_STATUS, labelOf } from "@/lib/constants";
import { formatDateCompact, formatIDR, formatPhone, waLink } from "@/lib/format";
import { deletePackage, setVendorStatus } from "@/features/vendor/actions";
import { DealModal, PackageFormModal, VendorFormModal, type Vendor, type VendorPackage } from "@/features/vendor/forms";
import { markPaymentPaid } from "@/features/budget/actions";
import { PaymentFormModal, type Payment } from "@/features/budget/payment-form";
import { statusTone } from "../vendor-list-client";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useI18n } from "@/i18n/client";

export function VendorDetailClient({ projectId, tz, vendor, packages, payments, documents, tasks, categories, items, vendors, canWrite }: {
  projectId: string; tz: string; vendor: Vendor; packages: VendorPackage[]; payments: Payment[];
  documents: { id: string; title: string; file_name: string; category: string; created_at: string }[];
  tasks: { id: string; title: string; status: string; due_date: string | null }[];
  categories: { id: string; name: string }[]; items: { id: string; name: string }[]; vendors: { id: string; name: string }[]; canWrite: boolean;
}) {
  const { t, lang } = useI18n();
  const base = useProjectBase();
  const [tab, setTab] = useState<"paket" | "pembayaran" | "dokumen" | "tugas">("paket");
  const [edit, setEdit] = useState(false);
  const [deal, setDeal] = useState(false);
  const [pkgForm, setPkgForm] = useState<VendorPackage | "new" | null>(null);
  const [payForm, setPayForm] = useState<Payment | "new" | null>(null);
  const paidTotal = payments.filter((p) => p.status === "sudah_bayar").reduce((s, p) => s + p.amount_idr, 0);

  return (
    <>
      <ProductTour id="vendor-detail" steps={TOURS["vendor-detail"]!} />
      <Link href={`${base}/vendor`} className="mb-3 inline-flex items-center gap-1 text-[13px] text-neutral-600 hover:text-plum-700"><ArrowLeft className="size-4" />{t("Semua vendor")}</Link>

      <Card tour="vendor-detail-main" className="mb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-lg bg-plum-100 font-display text-2xl font-semibold text-plum-700">{vendor.name[0]?.toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-neutral-500">{vendor.category}</p>
            <h1 className="text-[22px] leading-[30px] font-semibold text-neutral-900 md:text-[28px] md:leading-9">{vendor.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill tone={statusTone(vendor.status)}>{t(labelOf(VENDOR_STATUS, vendor.status))}</StatusPill>
              {vendor.deal_amount_idr && <span className="tabular text-sm font-semibold">{t("Deal {v1}", { v1: formatIDR(vendor.deal_amount_idr) })}</span>}
              {vendor.deal_date && <span className="text-[13px] text-neutral-500">· {formatDateCompact(vendor.deal_date, undefined, lang)}</span>}
            </div>
            <dl className="mt-4 grid gap-2 text-[13px] text-neutral-700 sm:grid-cols-2">
              {vendor.contact_person && <div className="flex items-center gap-2"><Phone className="size-4 text-neutral-400" />{vendor.contact_person}{vendor.phone_e164 && ` · ${formatPhone(vendor.phone_e164)}`}</div>}
              {vendor.email && <div className="flex items-center gap-2"><Mail className="size-4 text-neutral-400" /><a href={`mailto:${vendor.email}`} className="hover:underline">{vendor.email}</a></div>}
              {vendor.instagram && <div className="flex items-center gap-2"><AtSign className="size-4 text-neutral-400" /><a href={`https://instagram.com/${vendor.instagram}`} target="_blank" rel="noreferrer" className="hover:underline">@{vendor.instagram}</a></div>}
              {vendor.website && <div className="flex items-center gap-2"><Globe className="size-4 text-neutral-400" /><a href={vendor.website} target="_blank" rel="noreferrer" className="truncate hover:underline">{vendor.website}</a></div>}
              {vendor.address && <div className="flex items-center gap-2 sm:col-span-2"><MapPin className="size-4 shrink-0 text-neutral-400" />{vendor.address}</div>}
            </dl>
            {vendor.notes && <p className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-[13px] whitespace-pre-line text-neutral-700">{vendor.notes}</p>}
          </div>
          <div className="flex flex-wrap gap-2 md:flex-col">
            {vendor.phone_e164 && <ButtonLink href={waLink(vendor.phone_e164)} target="_blank" icon={<MessageCircle />}>{t("Chat WhatsApp")}</ButtonLink>}
            {canWrite && vendor.status !== "deal" && <Button variant="dark" icon={<Handshake />} onClick={() => setDeal(true)}>{t("Tandai Deal")}</Button>}
            {canWrite && <Button variant="secondary" icon={<Pencil />} onClick={() => setEdit(true)}>{t("Ubah")}</Button>}
          </div>
        </div>
        {canWrite && vendor.status !== "deal" && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-200 pt-4">
            <span className="self-center text-[13px] text-neutral-500">{t("Pindahkan ke:")}</span>
            {VENDOR_STATUS.filter((s) => s.key !== vendor.status && s.key !== "deal").map((s) => (
              <Button key={s.key} size="sm" variant="outline" onClick={() => setVendorStatus(projectId, vendor.id, s.key)}>{t(s.label)}</Button>
            ))}
          </div>
        )}
      </Card>

      <div data-tour="vendor-detail-tabs" className="mb-3 inline-block max-w-full"><Segmented value={tab} onChange={setTab} items={[
        { key: "paket", label: t("Paket ({length})", { length: packages.length }) },
        { key: "pembayaran", label: t("Pembayaran ({length})", { length: payments.length }) },
        { key: "dokumen", label: t("Dokumen ({length})", { length: documents.length }) },
        { key: "tugas", label: t("Tugas ({length})", { length: tasks.length }) },
      ]} /></div>

      {tab === "paket" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id} className={cn(vendor.selected_package_id === p.id && "border-2 border-plum-600")}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-800">{p.name}</p>
                  <p className="tabular mt-1 text-xl font-bold">{formatIDR(p.price_idr)}</p>
                </div>
                {vendor.selected_package_id === p.id && <StatusPill tone="positive">{t("Dipilih")}</StatusPill>}
                {canWrite && <RowMenu items={[
                  { label: t("Ubah"), icon: <Pencil />, onClick: () => setPkgForm(p) },
                  { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus paket ini?"), action: () => deletePackage(projectId, p.id) },
                ]} />}
              </div>
              {p.inclusions && <ul className="mt-3 space-y-1 text-[13px] text-neutral-700">{p.inclusions.split("\n").filter(Boolean).map((l, i) => <li key={i} className="flex gap-2"><CircleCheck className="mt-0.5 size-3.5 shrink-0 text-plum-600" />{l}</li>)}</ul>}
              {p.description && <p className="mt-2 text-[13px] text-neutral-500">{p.description}</p>}
            </Card>
          ))}
          {canWrite && (
            <button onClick={() => setPkgForm("new")} className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 text-sm font-medium text-plum-600 hover:bg-surface">
              <Plus className="size-5" />{t("Tambah paket")}</button>
          )}
          {!canWrite && packages.length === 0 && <Card className="sm:col-span-2 lg:col-span-3"><EmptyState icon={<Package />} title={t("Belum ada paket")} text={t("Paket dari vendor ini belum dicatat.")} /></Card>}
        </div>
      )}

      {tab === "pembayaran" && (
        <Card className="p-0 sm:p-0">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
            <span className="tabular text-[13px] text-neutral-600">{t("Sudah dibayar")}{" "}<b className="text-neutral-900">{formatIDR(paidTotal)}</b>{vendor.deal_amount_idr ? ` dari ${formatIDR(vendor.deal_amount_idr)}` : ""}</span>
            {canWrite && <Button size="sm" icon={<Plus />} onClick={() => setPayForm("new")}>{t("Pembayaran")}</Button>}
          </div>
          {payments.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">{t("Belum ada jadwal pembayaran.")}</p>}
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 border-b border-neutral-200 px-5 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.label ?? t(labelOf(PAYMENT_KIND, p.kind))}</p>
                <p className="text-xs text-neutral-500">{t("Jatuh tempo")}{" "}{formatDateCompact(p.due_date, tz, lang)}</p>
              </div>
              <span className="tabular text-sm font-semibold">{formatIDR(p.amount_idr)}</span>
              {p.status === "sudah_bayar" ? <StatusPill tone="positive">{t("Lunas")}</StatusPill> : <StatusPill>{t("Belum")}</StatusPill>}
              {canWrite && <RowMenu items={[
                { label: t("Tandai lunas"), icon: <CircleCheck />, hidden: p.status === "sudah_bayar", action: () => markPaymentPaid(projectId, p.id) },
                { label: t("Ubah"), icon: <Pencil />, onClick: () => setPayForm(p) },
              ]} />}
            </div>
          ))}
        </Card>
      )}

      {tab === "dokumen" && (
        <Card>
          {documents.length === 0 ? (
            <EmptyState icon={<FileText />} title={t("Belum ada dokumen")} text={t("Tautkan kontrak atau bukti bayar dari Dokumen Penting.")}
              action={<ButtonLink href={`${base}/dokumen`} variant="secondary">{t("Buka Dokumen Penting")}</ButtonLink>} />
          ) : (
            <ul className="divide-y divide-neutral-200">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3">
                  <FileText className="size-5 text-plum-600" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{d.title}</p><p className="text-xs text-neutral-500">{t(labelOf(DOCUMENT_CATEGORY, d.category))} · {d.file_name}</p></div>
                  <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-plum-600 hover:underline">{t("Buka")}</a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "tugas" && (
        <Card>
          {tasks.length === 0 ? <p className="py-6 text-center text-[13px] text-neutral-500">{t("Belum ada tugas yang terkait vendor ini.")}</p> : (
            <ul className="divide-y divide-neutral-200">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <CircleCheck className={cn("size-5", t.status === "done" ? "text-plum-600" : "text-neutral-300")} />
                  <span className={cn("flex-1 text-sm", t.status === "done" && "text-neutral-400 line-through")}>{t.title}</span>
                  <span className="text-xs text-neutral-500">{formatDateCompact(t.due_date, undefined, lang)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {edit && <VendorFormModal projectId={projectId} vendor={vendor} open onClose={() => setEdit(false)} />}
      {deal && <DealModal projectId={projectId} vendor={vendor} packages={packages} categories={categories} open onClose={() => setDeal(false)} />}
      {pkgForm && <PackageFormModal projectId={projectId} vendorId={vendor.id} pkg={pkgForm === "new" ? null : pkgForm} open onClose={() => setPkgForm(null)} />}
      {payForm && (
        <PaymentFormModal projectId={projectId} open onClose={() => setPayForm(null)} payment={payForm === "new" ? null : payForm}
          defaults={{ vendor_id: vendor.id }} items={items} vendors={vendors} />
      )}
    </>
  );
}
