"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Eye, Handshake, MessageCircle, Pencil, Plus, Star, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill, type Tone } from "@/components/ui/pill";
import { Segmented } from "@/components/ui/tabs";
import { VENDOR_STATUS, labelOf } from "@/lib/constants";
import { formatIDR, formatPhone, waLink } from "@/lib/format";
import { deleteVendor, setVendorStatus } from "@/features/vendor/actions";
import { DealModal, VendorFormModal, type Vendor, type VendorPackage } from "@/features/vendor/forms";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";

import { useProjectBase } from "@/components/app/project-base";
import { useT } from "@/i18n/client";
export const statusTone = (s: string): Tone => (s === "deal" ? "positive" : s === "batal" ? "danger" : s === "negosiasi" ? "caution" : "neutral");

export function VendorListClient({ projectId, vendors, packages, categories, canWrite }: {
  projectId: string; vendors: Vendor[]; packages: VendorPackage[]; categories: { id: string; name: string }[]; canWrite: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [view, setView] = useState<"tabel" | "pipeline">("tabel");
  const [category, setCategory] = useState("");
  const [form, setForm] = useState<Vendor | "new" | null>(null);
  const [deal, setDeal] = useState<Vendor | null>(null);
  const [compare, setCompare] = useState<string | null>(null);

  const cats = [...new Set(vendors.map((v) => v.category))].sort();
  const list = vendors.filter((v) => !category || v.category === category);
  const pkgOf = (v: Vendor) => packages.find((p) => p.id === v.selected_package_id);
  const base = useProjectBase();
  const href = (v: Vendor) => `${base}/vendor/${v.id}`;

  const menu = (v: Vendor) => (
    <RowMenu items={[
      { label: t("Lihat detail"), icon: <Eye />, href: href(v) },
      { label: t("Chat WhatsApp"), icon: <MessageCircle />, href: waLink(v.phone_e164), external: true, hidden: !v.phone_e164 },
      { label: t("Tandai deal"), icon: <Handshake />, hidden: !canWrite || v.status === "deal", onClick: () => setDeal(v) },
      { label: t("Ubah"), icon: <Pencil />, hidden: !canWrite, onClick: () => setForm(v) },
      { label: t("Hapus"), icon: <Trash2 />, danger: true, hidden: !canWrite, confirm: t("Hapus vendor {name}?", { name: v.name }), action: () => deleteVendor(projectId, v.id) },
    ]} />
  );

  return (
    <>
      <ProductTour id="vendor" steps={TOURS.vendor} />
      <PageHeader
        title={t("Kelola Vendor")}
        description={t("Dari prospek sampai deal.")}
        actions={canWrite && <Button data-tour="vendor-add" variant="dark" icon={<Plus />} onClick={() => setForm("new")}>{t("Tambah Vendor")}</Button>}
      />

      {vendors.length === 0 ? (
        <Card>
          <EmptyState icon={<Store />} title={t("Belum ada vendor")} text={t("Catat vendor yang kamu pertimbangkan.")}
            action={canWrite && <Button icon={<Plus />} onClick={() => setForm("new")}>{t("Tambah Vendor")}</Button>} />
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span data-tour="vendor-view" className="inline-flex"><Segmented items={[{ key: "tabel", label: t("Tabel") }, { key: "pipeline", label: t("Pipeline") }]} value={view} onChange={setView} /></span>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-auto rounded-full" aria-label={t("Filter kategori")}>
              <option value="">{t("Semua kategori")}</option>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </Select>
            {category && packages.some((p) => list.some((v) => v.id === p.vendor_id)) && (
              <Button variant="outline" icon={<ArrowRightLeft />} onClick={() => setCompare(category)}>{t("Bandingkan paket")}</Button>
            )}
          </div>

          {view === "tabel" ? (
            <Card className="p-0 sm:p-0">
              <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_120px_40px] gap-3 rounded-t-lg bg-neutral-50 px-5 py-2.5 text-xs font-medium text-neutral-500 md:grid">
                <span>{t("Vendor")}</span><span>{t("Kategori")}</span><span>{t("Kontak")}</span><span className="text-right">{t("Harga / Deal")}</span><span>{t("Status")}</span><span />
              </div>
              {list.map((v) => (
                <div key={v.id} onClick={() => router.push(href(v))} className="grid cursor-pointer grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-neutral-200 px-4 py-3 last:border-0 hover:bg-plum-50 sm:px-5 md:grid-cols-[1.5fr_1fr_1fr_1fr_120px_40px] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-plum-100 text-xs font-semibold text-plum-700">{v.name[0]?.toUpperCase()}</span>
                    <div className="min-w-0">
                      <Link href={href(v)} className="block truncate text-sm font-medium text-neutral-800 hover:text-plum-700">{v.name}</Link>
                      {v.rating && <span className="flex items-center gap-0.5 text-xs text-plum-600">{Array.from({ length: v.rating }).map((_, i) => <Star key={i} className="size-3 fill-current" />)}</span>}
                    </div>
                  </div>
                  <div className="col-start-2 row-start-1 md:hidden">{menu(v)}</div>
                  <p className="text-[13px] text-neutral-600">{v.category}</p>
                  <p className="truncate text-[13px] text-neutral-600">{v.contact_person ?? (v.phone_e164 ? formatPhone(v.phone_e164) : "-")}</p>
                  <p className="tabular text-sm font-semibold text-neutral-900 md:text-right">{v.deal_amount_idr ? formatIDR(v.deal_amount_idr) : pkgOf(v) ? formatIDR(pkgOf(v)!.price_idr) : "-"}</p>
                  <div><StatusPill tone={statusTone(v.status)}>{t(labelOf(VENDOR_STATUS, v.status))}</StatusPill></div>
                  <div className="hidden md:block">{menu(v)}</div>
                </div>
              ))}
            </Card>
          ) : (
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:px-0">
              {VENDOR_STATUS.map((s) => {
                const col = list.filter((v) => v.status === s.key);
                return (
                  <div key={s.key} className="w-[260px] shrink-0 snap-start rounded-lg bg-surface p-3 md:w-auto md:bg-neutral-50"
                    onDragOver={(e) => canWrite && e.preventDefault()}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData("text/vendor");
                      const v = vendors.find((x) => x.id === id);
                      if (!v || v.status === s.key) return;
                      if (s.key === "deal") setDeal(v);
                      else setVendorStatus(projectId, id, s.key);
                    }}>
                    <div className="mb-3 flex items-center justify-between px-1">
                      <span className="text-sm font-semibold text-neutral-800">{t(s.label)}</span>
                      <span className="tabular text-xs text-neutral-500">{col.length}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {col.map((v) => (
                        <div key={v.id} draggable={canWrite} onDragStart={(e) => e.dataTransfer.setData("text/vendor", v.id)}
                          className="rounded-md border border-neutral-200 bg-surface p-3">
                          <p className="text-xs text-neutral-500">{v.category}</p>
                          <Link href={href(v)} className="mt-0.5 block text-sm font-semibold text-neutral-800 hover:text-plum-700">{v.name}</Link>
                          <p className="tabular mt-1 text-[13px] text-neutral-600">{v.deal_amount_idr ? formatIDR(v.deal_amount_idr) : pkgOf(v) ? formatIDR(pkgOf(v)!.price_idr) : t("Belum ada harga")}</p>
                          <div className="mt-2 flex items-center justify-between">
                            {v.phone_e164 ? (
                              <a href={waLink(v.phone_e164)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-plum-600 hover:underline"><MessageCircle className="size-3.5" />{t("WhatsApp")}</a>
                            ) : <span />}
                            {menu(v)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {form && <VendorFormModal projectId={projectId} open vendor={form === "new" ? null : form} onClose={() => setForm(null)} goToDetail={form === "new"} />}
      {deal && <DealModal projectId={projectId} open vendor={deal} packages={packages.filter((p) => p.vendor_id === deal.id)} categories={categories} onClose={() => setDeal(null)} />}

      <Modal open={!!compare} onClose={() => setCompare(null)} title={t("Perbandingan paket: {compare}", { compare })} size="lg">
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr className="bg-neutral-50 text-left text-xs text-neutral-500"><th className="px-3 py-2">{t("Vendor")}</th><th className="px-3 py-2">{t("Paket")}</th><th className="px-3 py-2 text-right">{t("Harga")}</th><th className="px-3 py-2">{t("Isi paket")}</th></tr></thead>
            <tbody>
              {packages.filter((p) => vendors.find((v) => v.id === p.vendor_id)?.category === compare).sort((a, b) => a.price_idr - b.price_idr).map((p) => (
                <tr key={p.id} className="border-b border-neutral-200 align-top">
                  <td className="px-3 py-2 font-medium">{vendors.find((v) => v.id === p.vendor_id)?.name}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="tabular px-3 py-2 text-right font-semibold">{formatIDR(p.price_idr)}</td>
                  <td className="px-3 py-2 text-[13px] whitespace-pre-line text-neutral-600">{p.inclusions ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
