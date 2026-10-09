"use client";

import { useState } from "react";
import { ExternalLink, Gift, ImagePlus, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill, type Tone } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/tabs";
import { PURCHASE_STATUS, labelOf } from "@/lib/constants";
import { formatIDR, formatPercent } from "@/lib/format";
import { uploadProjectFile } from "@/lib/upload";
import { deleteGift, saveGift, setGiftStatus } from "@/features/gifts/actions";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useT } from "@/i18n/client";

type GiftItem = {
  id: string; type: "mahar" | "seserahan"; name: string; category: string | null; quantity: number; estimated_price_idr: number | null;
  actual_price_idr: number | null; purchase_url: string | null; store_name: string | null; status: string; image_path: string | null;
  image_url: string | null; budget_item_id: string | null; notes: string | null;
};

const tone = (s: string): Tone => (s === "diterima" || s === "dibeli" ? "positive" : s === "dipesan" ? "caution" : "neutral");
const CATS = { mahar: ["Perhiasan", "Uang tunai", "Alat ibadah", "Lainnya"], seserahan: ["Busana", "Kosmetik", "Perlengkapan mandi", "Alat ibadah", "Makanan", "Aksesori", "Lainnya"] };

export function GiftsClient({ projectId, items, canWrite }: { projectId: string; items: GiftItem[]; canWrite: boolean }) {
  const t = useT();
  const [tab, setTab] = useState<"mahar" | "seserahan">("mahar");
  const [form, setForm] = useState<GiftItem | "new" | null>(null);
  const list = items.filter((i) => i.type === tab);
  const est = list.reduce((s, i) => s + (i.estimated_price_idr ?? 0) * i.quantity, 0);
  const bought = list.filter((i) => i.status === "dibeli" || i.status === "diterima");
  const spent = bought.reduce((s, i) => s + (i.actual_price_idr ?? i.estimated_price_idr ?? 0) * i.quantity, 0);
  const progress = list.length ? bought.length / list.length : 0;

  return (
    <>
      <ProductTour id="mahar" steps={TOURS["mahar"]!} />
      <PageHeader tour="mahar" title={t("Mahar & Seserahan")} description={t("Rencana, harga, dan status pembelian.")}
        actions={canWrite && <Button variant="dark" icon={<Plus />} onClick={() => setForm("new")}>{t("Tambah Item")}</Button>} />
      <Segmented className="mb-4" items={[{ key: "mahar", label: t("Mahar") }, { key: "seserahan", label: t("Seserahan") }]} value={tab} onChange={setTab} />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard title={t("Total Estimasi")} value={formatIDR(est)} footer={<>{t("{length} item", { length: list.length })}</>} />
        <StatCard title={t("Total Dibeli")} value={formatIDR(spent)} footer={<>{t("{length} item sudah dibeli", { length: bought.length })}</>} />
        <Card tour="mahar-main">
          <h3 className="mb-3 text-sm font-semibold text-neutral-800">{t("Progres Pembelian")}</h3>
          <p className="tabular text-[28px] leading-9 font-bold">{formatPercent(progress)}</p>
          <ProgressBar value={progress} className="mt-3" />
        </Card>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<Gift />} title={t("Belum ada item {tab}", { tab })} text={t("Catat rencana {tab} beserta harga dan link tokonya.", { tab })}
            action={canWrite && <Button icon={<Plus />} onClick={() => setForm("new")}>{t("Tambah Item")}</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {list.map((i) => (
            <div key={i.id} className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-surface">
              <div className="relative aspect-[4/3] bg-plum-50">
                {i.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.image_url} alt={i.name} className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-plum-300"><Gift className="size-10" /></span>
                )}
                {canWrite && (
                  <div className="absolute top-2 right-2">
                    <RowMenu items={[
                      { label: t("Ubah"), icon: <Pencil />, onClick: () => setForm(i) },
                      ...PURCHASE_STATUS.filter((s) => s.key !== i.status).map((s) => ({ label: t("Tandai {v1}", { v1: s.label.toLowerCase() }), action: () => setGiftStatus(projectId, i.id, s.key) })),
                      { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus item ini?"), action: () => deleteGift(projectId, i.id) },
                    ]} />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="text-xs text-neutral-500">{i.category ?? t("Tanpa kategori")}{i.quantity > 1 && t("· {quantity}x", { quantity: i.quantity })}</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-neutral-800">{i.name}</p>
                <p className="tabular mt-1 text-sm font-semibold">{formatIDR(i.actual_price_idr ?? i.estimated_price_idr ?? 0)}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                  <StatusPill tone={tone(i.status)}>{t(labelOf(PURCHASE_STATUS, i.status))}</StatusPill>
                  {i.purchase_url && (
                    <a href={i.purchase_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-plum-600 hover:underline">
                      <ShoppingBag className="size-3.5" />{i.store_name ?? t("Toko")}<ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && <GiftForm projectId={projectId} item={form === "new" ? null : form} type={tab} onClose={() => setForm(null)} />}
    </>
  );
}

function GiftForm({ projectId, item, type, onClose }: { projectId: string; item: GiftItem | null; type: "mahar" | "seserahan"; onClose: () => void }) {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const kind = item?.type ?? type;
  return (
    <Modal open onClose={onClose} title={item ? t("Ubah Item") : t("Tambah Item {v1}", { v1: kind === "mahar" ? "Mahar" : "Seserahan" })} size="lg">
      <ActionForm
        action={async (fd) => {
          if (file) {
            try {
              const up = await uploadProjectFile(projectId, "gifts", file);
              fd.set("image_path", up.path);
            } catch (e) {
              return { ok: false, error: (e as Error).message };
            }
          }
          return saveGift(projectId, fd);
        }}
        onSuccess={onClose}
      >
        {item && <input type="hidden" name="id" value={item.id} />}
        {item?.budget_item_id && <input type="hidden" name="budget_item_id" value={item.budget_item_id} />}
        <input type="hidden" name="type" value={kind} />
        <FormGrid>
          <Field label={t("Nama item")} htmlFor="gf-name" className="sm:col-span-2"><Input id="gf-name" name="name" required defaultValue={item?.name} /></Field>
          <Field label={t("Kategori")} htmlFor="gf-cat">
            <Select id="gf-cat" name="category" defaultValue={item?.category ?? ""}>
              <option value="">{t("Tanpa kategori")}</option>
              {CATS[kind].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label={t("Jumlah")} htmlFor="gf-qty"><Input id="gf-qty" type="number" min={1} name="quantity" defaultValue={item?.quantity ?? 1} /></Field>
          <Field label={t("Estimasi harga (per item)")} htmlFor="gf-est"><CurrencyInput id="gf-est" name="estimated_price_idr" defaultValue={item?.estimated_price_idr} /></Field>
          <Field label={t("Harga beli (per item)")} htmlFor="gf-act"><CurrencyInput id="gf-act" name="actual_price_idr" defaultValue={item?.actual_price_idr} /></Field>
          <Field label={t("Nama toko")} htmlFor="gf-store"><Input id="gf-store" name="store_name" defaultValue={item?.store_name ?? ""} /></Field>
          <Field label={t("Link toko")} htmlFor="gf-url"><Input id="gf-url" type="url" name="purchase_url" placeholder="https://" defaultValue={item?.purchase_url ?? ""} /></Field>
          <Field label={t("Status")} htmlFor="gf-status">
            <Select id="gf-status" name="status" defaultValue={item?.status ?? "rencana"}>{PURCHASE_STATUS.map((s) => <option key={s.key} value={s.key}>{t(s.label)}</option>)}</Select>
          </Field>
          <Field label={t("Foto")} htmlFor="gf-img" help={t("JPG, PNG, atau WEBP. Dikompres otomatis.")}>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-neutral-300 px-3 text-[13px] text-neutral-600 hover:bg-neutral-50">
              <ImagePlus className="size-4" /><span className="truncate">{file?.name ?? (item?.image_path ? t("Ganti foto") : t("Pilih foto"))}</span>
              <input id="gf-img" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </Field>
        </FormGrid>
        <Field label={t("Catatan")} htmlFor="gf-notes"><Textarea id="gf-notes" name="notes" defaultValue={item?.notes ?? ""} /></Field>
        <label className="flex items-center gap-2 text-[13px]"><Checkbox name="link_budget" defaultChecked={!!item?.budget_item_id} />{t("Catat ke budget kategori \"Mahar & Seserahan\"")}</label>
        {item?.image_path && <label className="flex items-center gap-2 text-[13px] text-neutral-600"><Checkbox name="remove_image" />{t("Hapus foto")}</label>}
        <FormActions><Button variant="secondary" onClick={onClose}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
      </ActionForm>
    </Modal>
  );
}
