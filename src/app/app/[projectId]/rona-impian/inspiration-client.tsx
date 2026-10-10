"use client";

import { useMemo, useState, useTransition } from "react";
import { Brush, ExternalLink, Flower2, ImagePlus, Landmark, Pencil, Plus, Shapes, Shirt, Sparkles, Star, Trash2, UtensilsCrossed, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { uploadProjectFile } from "@/lib/upload";
import { deleteInspiration, saveInspiration, toggleInspirationFavorite } from "@/features/inspiration/actions";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useT } from "@/i18n/client";

type Item = {
  id: string; category: string; title: string; note: string | null; link_url: string | null; color: string | null;
  image_path: string | null; image_url: string | null; is_favorite: boolean;
};

const CATEGORIES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "dekorasi", label: "Dekorasi", icon: Sparkles },
  { key: "busana", label: "Busana", icon: Shirt },
  { key: "bunga", label: "Bunga", icon: Flower2 },
  { key: "venue", label: "Venue", icon: Landmark },
  { key: "makeup", label: "Makeup", icon: Brush },
  { key: "katering", label: "Katering", icon: UtensilsCrossed },
  { key: "lainnya", label: "Lainnya", icon: Shapes },
];
const meta = (k: string) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[CATEGORIES.length - 1]!;

export function InspirationClient({ projectId, items, canWrite }: { projectId: string; items: Item[]; canWrite: boolean }) {
  const t = useT();
  const toast = useToast();
  const [cat, setCat] = useState<string>("semua");
  const [color, setColor] = useState<string | null>(null);
  const [onlyFav, setOnlyFav] = useState(false);
  const [form, setForm] = useState<{ item: Item | null; category?: string } | null>(null);
  const [, start] = useTransition();

  const palette = useMemo(() => [...new Set(items.map((i) => i.color).filter(Boolean) as string[])].slice(0, 14), [items]);
  const counts = useMemo(() => items.reduce<Record<string, number>>((m, i) => ({ ...m, [i.category]: (m[i.category] ?? 0) + 1 }), {}), [items]);
  const list = items.filter((i) => (cat === "semua" || i.category === cat) && (!color || i.color === color) && (!onlyFav || i.is_favorite));

  const fav = (i: Item) => start(async () => { const r = await toggleInspirationFavorite(projectId, i.id, !i.is_favorite); if (!r.ok) toast(r.error, "danger"); });

  return (
    <>
      <ProductTour id="inspirasi" steps={TOURS["inspirasi"]!} />
      <PageHeader tour="inspirasi" title={t("Rona Impian")} description={t("Kumpulkan ide dekorasi, busana, bunga, dan warna untuk hari bahagiamu.")}
        actions={canWrite && <Button variant="dark" icon={<Plus />} onClick={() => setForm({ item: null })}>{t("Tambah Ide")}</Button>} />

      {items.length > 0 && (
        <Card tour="inspirasi-palette" className="mb-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-800">{t("Palet warnamu")}</p>
              <p className="text-[13px] text-neutral-500">{palette.length ? t("Klik satu warna untuk melihat ide yang cocok.") : t("Tambahkan warna pada ide, dan paletnya muncul di sini.")}</p>
            </div>
            {palette.length > 0 && (
              <ul className="flex flex-wrap items-center gap-2" aria-label={t("Palet warnamu")}>
                {palette.map((c) => (
                  <li key={c}>
                    <button onClick={() => setColor(color === c ? null : c)} aria-pressed={color === c} aria-label={c} title={c}
                      className={cn("size-9 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-110", color === c && "scale-110 ring-2 ring-plum-600 ring-offset-2 ring-offset-surface")} style={{ backgroundColor: c }} />
                  </li>
                ))}
                {color && <button onClick={() => setColor(null)} className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-xs md:h-8 md:px-2.5 font-medium text-neutral-600 hover:bg-neutral-100"><X className="size-3.5" />{t("Hapus filter")}</button>}
              </ul>
            )}
          </div>
        </Card>
      )}

      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label={t("Kategori")}>
          {[{ key: "semua", label: t("Semua"), n: items.length }, ...CATEGORIES.filter((c) => counts[c.key]).map((c) => ({ key: c.key, label: t(c.label), n: counts[c.key]! }))].map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)} aria-pressed={cat === c.key}
              className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors", cat === c.key ? "bg-plum-600 text-white" : "bg-surface text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50")}>
              {c.label}<span className={cn("tabular text-[11px]", cat === c.key ? "text-white/80" : "text-neutral-500")}>{c.n}</span>
            </button>
          ))}
          <button onClick={() => setOnlyFav(!onlyFav)} aria-pressed={onlyFav}
            className={cn("ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors", onlyFav ? "bg-[#F3C969] text-[#3E2A00]" : "bg-surface text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50")}>
            <Star className="size-3.5" />{t("Favorit")}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <Card tour="inspirasi-main">
          <EmptyState icon={<Sparkles />} title={t("Belum ada ide")} text={t("Mulai dari satu kategori. Foto, warna, dan tautan sumber bisa ditambahkan belakangan.")}
            action={canWrite && (
              <div className="flex flex-wrap justify-center gap-2">
                {CATEGORIES.slice(0, 4).map((c) => <Button key={c.key} variant="outline" size="sm" icon={<c.icon />} onClick={() => setForm({ item: null, category: c.key })}>{t(c.label)}</Button>)}
              </div>
            )} />
        </Card>
      ) : list.length === 0 ? (
        <Card><p className="py-8 text-center text-[13px] text-neutral-500">{t("Tidak ada ide yang cocok dengan filter ini.")}</p></Card>
      ) : (
        <div data-tour="inspirasi-main" className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4">
          {list.map((i) => {
            const m = meta(i.category);
            return (
              <article key={i.id} data-row-id={i.id} className="hover-lift mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-neutral-200/80 bg-surface shadow-card">
                <div className={cn("relative", i.image_url ? "" : "flex h-32 items-center justify-center")} style={!i.image_url ? { backgroundColor: i.color ?? undefined } : undefined}>
                  {i.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image_url} alt={i.title} loading="lazy" className="w-full object-cover" />
                  ) : !i.color ? <span className="absolute inset-0 bg-plum-50" /> : null}
                  {!i.image_url && <m.icon className={cn("relative size-9", i.color ? "text-black/30" : "text-plum-300")} aria-hidden="true" />}
                  {i.color && i.image_url && <span className="absolute bottom-2 left-2 size-5 rounded-full border-2 border-white shadow" style={{ backgroundColor: i.color }} aria-hidden="true" />}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {canWrite ? (
                      <button onClick={() => fav(i)} aria-pressed={i.is_favorite} aria-label={t("Tandai favorit")} className="inline-flex size-10 md:size-8 items-center justify-center rounded-full bg-surface/90 shadow-sm backdrop-blur hover:bg-surface">
                        <Star className={cn("size-4", i.is_favorite ? "fill-[#E8A93A] text-[#E8A93A]" : "text-neutral-500")} />
                      </button>
                    ) : i.is_favorite ? <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface/90 shadow-sm"><Star className="size-4 fill-[#E8A93A] text-[#E8A93A]" /></span> : null}
                    {canWrite && (
                      <span className="rounded-full bg-surface/90 shadow-sm backdrop-blur">
                        <RowMenu items={[
                          { label: t("Ubah"), icon: <Pencil />, onClick: () => setForm({ item: i }) },
                          { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus ide ini?"), action: () => deleteInspiration(projectId, i.id) },
                        ]} />
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3.5">
                  <p className="text-[11px] font-semibold tracking-[0.1em] text-plum-600 uppercase">{t(m.label)}</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-neutral-900">{i.title}</p>
                  {i.note && <p className="mt-1 line-clamp-3 text-[13px] leading-5 text-neutral-600">{i.note}</p>}
                  {i.link_url && (
                    <a href={i.link_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-plum-700 hover:underline">
                      {t("Buka sumber")}<ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {form && <InspirationForm projectId={projectId} item={form.item} category={form.category} onClose={() => setForm(null)} />}
    </>
  );
}

function InspirationForm({ projectId, item, category, onClose }: { projectId: string; item: Item | null; category?: string; onClose: () => void }) {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [color, setColor] = useState(item?.color ?? "");
  return (
    <Modal open onClose={onClose} title={item ? t("Ubah Ide") : t("Tambah Ide")} size="lg">
      <ActionForm
        action={async (fd) => {
          if (file) {
            try { fd.set("image_path", (await uploadProjectFile(projectId, "inspiration", file)).path); }
            catch (e) { return { ok: false, error: (e as Error).message }; }
          }
          fd.set("color", color);
          return saveInspiration(projectId, fd);
        }}
        onSuccess={onClose}
      >
        {item && <input type="hidden" name="id" value={item.id} />}
        <FormGrid>
          <Field label={t("Judul")} htmlFor="ri-title" className="sm:col-span-2"><Input id="ri-title" name="title" required maxLength={120} defaultValue={item?.title} placeholder={t("Backdrop bunga putih")} /></Field>
          <Field label={t("Kategori")} htmlFor="ri-cat">
            <Select id="ri-cat" name="category" defaultValue={item?.category ?? category ?? "dekorasi"}>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{t(c.label)}</option>)}</Select>
          </Field>
          <Field label={t("Warna")} htmlFor="ri-color" help={t("Opsional. Masuk ke palet warnamu.")}>
            <div className="flex items-center gap-2">
              <input id="ri-color" type="color" value={color || "#8C3A63"} onChange={(e) => setColor(e.target.value.toUpperCase())} className="h-10 w-12 cursor-pointer rounded-md border border-neutral-200 bg-surface p-1" aria-label={t("Warna")} />
              <span className="tabular text-[13px] text-neutral-600">{color || t("Belum dipilih")}</span>
              {color && <button type="button" onClick={() => setColor("")} className="text-xs font-medium text-plum-700 hover:underline">{t("Hapus")}</button>}
            </div>
          </Field>
          <Field label={t("Tautan sumber")} htmlFor="ri-link"><Input id="ri-link" type="url" name="link_url" placeholder="https://" maxLength={500} defaultValue={item?.link_url ?? ""} /></Field>
          <Field label={t("Foto")} htmlFor="ri-img" help={t("JPG, PNG, atau WEBP. Dikompres otomatis.")}>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-neutral-300 px-3 text-[13px] text-neutral-600 hover:bg-neutral-50">
              <ImagePlus className="size-4" /><span className="truncate">{file?.name ?? (item?.image_path ? t("Ganti foto") : t("Pilih foto"))}</span>
              <input id="ri-img" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </Field>
        </FormGrid>
        <Field label={t("Catatan")} htmlFor="ri-note"><Textarea id="ri-note" name="note" maxLength={500} defaultValue={item?.note ?? ""} /></Field>
        <label className="flex items-center gap-2 text-[13px]"><Checkbox name="is_favorite" defaultChecked={item?.is_favorite} />{t("Tandai sebagai favorit")}</label>
        {item?.image_path && <label className="flex items-center gap-2 text-[13px] text-neutral-600"><Checkbox name="remove_image" />{t("Hapus foto")}</label>}
        <FormActions><Button variant="secondary" onClick={onClose}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
      </ActionForm>
    </Modal>
  );
}
