"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CircleAlert, ExternalLink, Eye, EyeOff, FolderPlus, MousePointerClick, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionButton, ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusPill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { BioView } from "@/components/bio/bio-view";
import {
  createBioLink, createBioSection, deleteBioLink, deleteBioSection, moveBioItem, toggleBioLink, toggleBioSection, updateBioLink, updateBioSection,
} from "@/features/admin/link-actions";
import { BIO_ICONS, BIO_ICON_LABEL, BIO_SECTION_KIND_LABEL, buildBioTree, type BioLinkItem, type BioSectionItem } from "@/lib/links";
import type { ContactInfo } from "@/lib/support";
import { useI18n } from "@/i18n/client";

type Run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => void;

export function BioClient({ links, sections, contact, views, bioUrl, missing, sectionsMissing }: {
  links: BioLinkItem[]; sections: BioSectionItem[]; contact: ContactInfo; views: number; bioUrl: string; missing: boolean; sectionsMissing: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [, start] = useTransition();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [linkForm, setLinkForm] = useState<{ open: boolean; link: BioLinkItem | null; section: string | null }>({ open: false, link: null, section: null });
  const [sectionForm, setSectionForm] = useState<{ open: boolean; section: BioSectionItem | null }>({ open: false, section: null });
  const url = bioUrl;

  const tree = useMemo(() => buildBioTree(sections, links, false), [sections, links]);
  const publicTree = useMemo(() => buildBioTree(sections, links, true), [sections, links]);
  const clicks = links.reduce((n, l) => n + l.click_count, 0);
  const active = links.filter((l) => l.is_active).length;

  const run: Run = (fn) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { if (r.message) toast(r.message); router.refresh(); } else toast(r.error ?? "", "danger");
    });

  // Pencarian menyaring tautan (judul, tujuan, deskripsi); judul section tetap tampil bila ada isinya yang cocok. Saringan section menampilkan satu section saja.
  const needle = q.trim().toLowerCase();
  const match = (l: BioLinkItem) => !needle || [l.label, l.url, l.description, l.badge].some((x) => x?.toLowerCase().includes(needle));
  const shown = tree
    .filter((n) => !filter || (n.type === "section" && n.section.id === filter))
    .map((n) => (n.type === "link" ? (match(n.link) ? n : null) : (() => { const kids = n.links.filter(match); return needle && kids.length === 0 && !n.section.title.toLowerCase().includes(needle) ? null : { ...n, links: needle && !n.section.title.toLowerCase().includes(needle) ? kids : n.links }; })()))
    .filter((n): n is NonNullable<typeof n> => !!n);

  const topKeys = tree.map((n) => (n.type === "link" ? n.link.id : n.section.id));

  return (
    <>
      <PageHeader title={t("Bio Link")} description={t("Satu halaman berisi semua tautan pentingmu, untuk bio Instagram, TikTok, atau WhatsApp. Atur tombol dan section di sini, tampilannya sudah diatur.")}
        actions={
          <>
            <CopyButton value={url} label={t("Salin tautan bio")} variant="outline" size="md" message={t("Tautan disalin.")}>{t("Salin tautan")}</CopyButton>
            <a href={bioUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-plum-700 hover:bg-plum-50">{t("Lihat halaman")}<ExternalLink className="size-3.5" aria-hidden="true" /></a>
          </>
        } />

      {missing && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Tabel tautan belum ada di database. Jalankan migrasi 20261112000001_links.sql di Supabase SQL Editor, lalu muat ulang halaman ini.")}
        </p>
      )}
      {sectionsMissing && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Section, tautan unggulan, label, dan kartu ajakan butuh migrasi 20261112000002_bio_sections.sql. Jalankan di Supabase SQL Editor, lalu muat ulang halaman ini.")}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-0 sm:p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
            <CardHeader title={t("Daftar tautan")} subtitle={t("{n} tombol · {a} aktif · {c} klik · {v} kunjungan", { n: links.length, a: active, c: clicks.toLocaleString("id-ID"), v: views.toLocaleString("id-ID") })} />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" icon={<FolderPlus />} disabled={missing || sectionsMissing} onClick={() => setSectionForm({ open: true, section: null })}>{t("Section baru")}</Button>
              <Button variant="dark" icon={<Plus />} disabled={missing} onClick={() => setLinkForm({ open: true, link: null, section: null })}>{t("Tambah Tombol")}</Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 px-5 pt-4 pb-4 sm:px-6">
            <div className="relative min-w-0 flex-1 basis-52">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Cari judul atau tujuan")} aria-label={t("Cari tombol")} className="pl-9" />
            </div>
            {sections.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("Saring per section")}>
                {[{ id: "", title: t("Semua") }, ...sections.map((s) => ({ id: s.id, title: s.title }))].map((c) => (
                  <button key={c.id || "all"} type="button" onClick={() => setFilter(c.id)} aria-pressed={filter === c.id}
                    className={cn("h-9 rounded-full px-3.5 text-[12px] font-semibold tracking-wide uppercase transition-colors", filter === c.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100")}>{c.title}</button>
                ))}
              </div>
            )}
          </div>

          {links.length === 0 && sections.length === 0 ? (
            <p className="border-t border-neutral-200 px-5 py-12 text-center text-[13px] text-neutral-500">{t("Belum ada tombol. Tambahkan tautan ke toko, WhatsApp, atau Instagram.")}</p>
          ) : shown.length === 0 ? (
            <p className="border-t border-neutral-200 px-5 py-10 text-center text-[13px] text-neutral-500">{t("Tidak ada tombol yang cocok dengan pencarian.")}</p>
          ) : (
            <ul className="border-t border-neutral-200">
              {shown.map((n) => {
                if (n.type === "link") {
                  const i = topKeys.indexOf(n.link.id);
                  return <LinkRow key={n.link.id} l={n.link} first={i === 0} last={i === topKeys.length - 1} run={run} onEdit={() => setLinkForm({ open: true, link: n.link, section: null })} />;
                }
                const s = n.section;
                const i = topKeys.indexOf(s.id);
                const sectionClicks = n.links.reduce((c, l) => c + l.click_count, 0);
                const allKids = links.filter((l) => l.section_id === s.id).sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1));
                return (
                  <li key={s.id}>
                    <div className={cn("flex flex-col gap-2 border-b border-neutral-200 bg-neutral-50 px-5 py-3 md:flex-row md:items-center sm:px-6", !s.is_active && "opacity-60")}>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] text-neutral-500">{t("Section · {kind}", { kind: t(BIO_SECTION_KIND_LABEL[s.kind]).toLowerCase() })} · {t("{n} tombol", { n: allKids.length })} · {sectionClicks.toLocaleString("id-ID")} {t("klik")}</p>
                        <p className="truncate text-[14px] font-semibold tracking-wide uppercase">{s.title}{!s.is_active && <span className="ml-2 align-middle"><StatusPill>{t("Disembunyikan")}</StatusPill></span>}</p>
                      </div>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon-sm" title={t("Tambah tombol di section ini")} aria-label={t("Tambah tombol di section ini")} onClick={() => setLinkForm({ open: true, link: null, section: s.id })}><Plus /></Button>
                        <Button variant="ghost" size="icon-sm" title={s.is_active ? t("Sembunyikan") : t("Tampilkan")} aria-label={s.is_active ? t("Sembunyikan") : t("Tampilkan")} onClick={() => run(() => toggleBioSection(s.id, !s.is_active))}>{s.is_active ? <Eye /> : <EyeOff />}</Button>
                        <Button variant="ghost" size="icon-sm" title={t("Naik")} aria-label={t("Naik")} disabled={i === 0} onClick={() => run(() => moveBioItem("section", s.id, "up"))}><ArrowUp /></Button>
                        <Button variant="ghost" size="icon-sm" title={t("Turun")} aria-label={t("Turun")} disabled={i === topKeys.length - 1} onClick={() => run(() => moveBioItem("section", s.id, "down"))}><ArrowDown /></Button>
                        <Button variant="ghost" size="icon-sm" title={t("Ubah")} aria-label={t("Ubah")} onClick={() => setSectionForm({ open: true, section: s })}><Pencil /></Button>
                        <ActionButton size="icon-sm" variant="ghost" title={t("Hapus")} icon={<Trash2 />} confirmText={t("Hapus section {title}? Tombol di dalamnya dipindah ke daftar utama.", { title: s.title })} action={() => deleteBioSection(s.id)} onSuccess={() => router.refresh()} />
                      </div>
                    </div>
                    {n.links.length === 0 && <p className="border-b border-neutral-200 py-4 pl-10 text-[12.5px] text-neutral-500">{needle ? t("Tidak ada tombol yang cocok.") : t("Section ini masih kosong.")}</p>}
                    <ul className="border-l-2 border-plum-100 pl-0 sm:ml-4">
                      {n.links.map((l) => {
                        const j = allKids.findIndex((x) => x.id === l.id);
                        return <LinkRow key={l.id} l={l} first={j === 0} last={j === allKids.length - 1} nested run={run} onEdit={() => setLinkForm({ open: true, link: l, section: null })} />;
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader icon={<Eye />} title={t("Pratinjau")} subtitle={t("Seperti yang dilihat pengunjung.")} />
            <div className="mx-auto h-[600px] w-[300px] overflow-hidden rounded-[36px] border-[7px] border-neutral-900 bg-neutral-900 shadow-modal">
              <div className="h-full w-full overflow-x-hidden overflow-y-auto rounded-[28px] bg-[#FBF5F8]">
                {/* Layar HP 390px diperkecil dengan zoom (bukan transform) agar tinggi dan gulir mengikuti isi, berapa pun jumlah tombolnya */}
                <div style={{ width: 390, zoom: 0.733 }}>
                  <BioView nodes={publicTree} contact={contact} hrefFor={() => "#"} preview
                    labels={{ tagline: t("Persiapan pernikahan, rapi dalam satu tempat."), footer: t("Dibuat dengan Monaplan"), emptyHint: t("Tambahkan tombol pertama lewat tombol Tambah Tombol."), featured: t("Unggulan") }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={linkForm.open} onClose={() => setLinkForm({ open: false, link: null, section: null })} title={linkForm.link ? t("Ubah Tombol") : t("Tambah Tombol")} size="lg">
        {linkForm.open && (
          <ActionForm action={linkForm.link ? updateBioLink : createBioLink} onSuccess={() => { setLinkForm({ open: false, link: null, section: null }); router.refresh(); }}>
            {linkForm.link && <input type="hidden" name="id" value={linkForm.link.id} />}
            <FormGrid>
              <Field label={t("Judul tombol")} htmlFor="bl-label"><Input id="bl-label" name="label" required maxLength={60} defaultValue={linkForm.link?.label ?? ""} autoComplete="off" placeholder={t("Beli Monaplan sekarang")} /></Field>
              <Field label={t("Deskripsi (opsional)")} htmlFor="bl-desc" help={t("Satu baris di bawah judul.")}><Input id="bl-desc" name="description" maxLength={80} defaultValue={linkForm.link?.description ?? ""} autoComplete="off" placeholder={t("Akses selamanya, sekali bayar")} /></Field>
            </FormGrid>
            <Field label={t("Tujuan")} htmlFor="bl-url" help={t("Alamat lengkap tujuan. Contoh: https://lynk.id/monaplan")}>
              <Input id="bl-url" name="url" required inputMode="url" maxLength={2000} defaultValue={linkForm.link?.url ?? ""} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="https://" />
            </Field>
            <FormGrid>
              <Field label={t("Ikon")} htmlFor="bl-icon">
                <Select id="bl-icon" name="icon" defaultValue={linkForm.link?.icon ?? "link"}>{BIO_ICONS.map((x) => <option key={x} value={x}>{t(BIO_ICON_LABEL[x])}</option>)}</Select>
              </Field>
              <Field label={t("Section")} htmlFor="bl-section">
                <Select id="bl-section" name="section_id" defaultValue={linkForm.link?.section_id ?? linkForm.section ?? ""}>
                  <option value="">{t("Tanpa section")}</option>
                  {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </Select>
              </Field>
              <Field label={t("Label kecil (opsional)")} htmlFor="bl-badge" help={t("Contoh: BARU atau HOTLINE.")}><Input id="bl-badge" name="badge" maxLength={20} defaultValue={linkForm.link?.badge ?? ""} autoComplete="off" /></Field>
              <Field label={t("Tombol ajakan (opsional)")} htmlFor="bl-cta" help={t("Isi untuk tampil sebagai kartu dengan satu tombol, contoh: Hubungi WA.")}><Input id="bl-cta" name="cta_label" maxLength={24} defaultValue={linkForm.link?.cta_label ?? ""} autoComplete="off" /></Field>
            </FormGrid>
            <label className="flex items-start gap-3 rounded-xl bg-plum-50 px-4 py-3 text-[13px] leading-5 text-neutral-700">
              <input type="checkbox" name="is_featured" defaultChecked={linkForm.link?.is_featured} className="mt-0.5 size-4 accent-plum-600" />
              <span><b className="font-semibold text-neutral-900">{t("Jadikan unggulan")}</b><br />{t("Tampil lebih menonjol dengan tanda Unggulan.")}</span>
            </label>
            <FormActions><Button variant="secondary" onClick={() => setLinkForm({ open: false, link: null, section: null })}>{t("Batal")}</Button><SubmitButton>{linkForm.link ? t("Simpan") : t("Tambah Tombol")}</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>

      <Modal open={sectionForm.open} onClose={() => setSectionForm({ open: false, section: null })} title={sectionForm.section ? t("Ubah Section") : t("Section baru")}>
        {sectionForm.open && (
          <ActionForm action={sectionForm.section ? updateBioSection : createBioSection} onSuccess={() => { setSectionForm({ open: false, section: null }); router.refresh(); }}>
            {sectionForm.section && <input type="hidden" name="id" value={sectionForm.section.id} />}
            <Field label={t("Nama section")} htmlFor="bs-title"><Input id="bs-title" name="title" required maxLength={60} defaultValue={sectionForm.section?.title ?? ""} autoComplete="off" placeholder={t("Tentang Kami")} /></Field>
            <Field label={t("Jenis")} htmlFor="bs-kind" help={t("Dropdown tertutup di awal; pengunjung membukanya dengan satu ketukan.")}>
              <Select id="bs-kind" name="kind" defaultValue={sectionForm.section?.kind ?? "normal"}>
                {(["normal", "dropdown"] as const).map((k) => <option key={k} value={k}>{t(BIO_SECTION_KIND_LABEL[k])}</option>)}
              </Select>
            </Field>
            <FormActions><Button variant="secondary" onClick={() => setSectionForm({ open: false, section: null })}>{t("Batal")}</Button><SubmitButton>{sectionForm.section ? t("Simpan") : t("Buat Section")}</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>
    </>
  );
}

function LinkRow({ l, first, last, nested = false, run, onEdit }: { l: BioLinkItem; first: boolean; last: boolean; nested?: boolean; run: Run; onEdit: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <li className={cn("flex flex-col gap-2.5 border-b border-neutral-200 px-5 py-3.5 last:border-b-0 md:flex-row md:items-center sm:px-6", nested && "sm:pl-5", !l.is_active && "bg-neutral-50/70")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={cn("text-sm font-medium", !l.is_active && "text-neutral-500")}>{l.label}</p>
          {l.is_featured && <span className="inline-flex items-center gap-1 rounded-full bg-caution-bg px-2 py-0.5 text-[10.5px] leading-4 font-bold tracking-wide text-caution uppercase"><Star className="size-3 fill-current" aria-hidden="true" />{t("Unggulan")}</span>}
          {l.badge && <span className="rounded-full bg-plum-100 px-2 py-0.5 text-[10.5px] leading-4 font-bold tracking-wide text-plum-700 uppercase">{l.badge}</span>}
          {l.cta_label && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] leading-4 font-semibold text-neutral-600">{t("Kartu ajakan")}</span>}
          {!l.is_active && <StatusPill>{t("Disembunyikan")}</StatusPill>}
        </div>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-500">
          <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-px text-[10.5px] font-medium">{t(BIO_ICON_LABEL[l.icon])}</span>
          <span className="truncate">{l.description ? `${l.description} · ` : ""}{l.url}</span>
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end">
        <p className="tabular flex items-center gap-1 text-[13px] text-neutral-600"><MousePointerClick className="size-3.5 text-neutral-400" aria-hidden="true" />{l.click_count.toLocaleString("id-ID")}</p>
        <div className="flex items-center">
          <Button variant="ghost" size="icon-sm" title={l.is_active ? t("Sembunyikan") : t("Tampilkan")} aria-label={l.is_active ? t("Sembunyikan") : t("Tampilkan")} onClick={() => run(() => toggleBioLink(l.id, !l.is_active))}>{l.is_active ? <Eye /> : <EyeOff />}</Button>
          <Button variant="ghost" size="icon-sm" title={t("Naik")} aria-label={t("Naik")} disabled={first} onClick={() => run(() => moveBioItem("link", l.id, "up"))}><ArrowUp /></Button>
          <Button variant="ghost" size="icon-sm" title={t("Turun")} aria-label={t("Turun")} disabled={last} onClick={() => run(() => moveBioItem("link", l.id, "down"))}><ArrowDown /></Button>
          <Button variant="ghost" size="icon-sm" title={t("Ubah")} aria-label={t("Ubah")} onClick={onEdit}><Pencil /></Button>
          <ActionButton size="icon-sm" variant="ghost" title={t("Hapus")} icon={<Trash2 />} confirmText={t("Hapus tombol {label}?", { label: l.label })} action={() => deleteBioLink(l.id)} onSuccess={() => router.refresh()} />
        </div>
      </div>
    </li>
  );
}
