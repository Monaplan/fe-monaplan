"use client";

import { useState } from "react";
import { Download, Eye, FileImage, FileText, Info, LayoutGrid, List, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { ProgressBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/tabs";

import { cn } from "@/components/ui/cn";
import { DOCUMENT_CATEGORY, labelOf } from "@/lib/constants";
import { formatDateCompact } from "@/lib/format";
import { MAX_FILE_MB } from "@/lib/limits";
import { uploadProjectFile } from "@/lib/upload";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import {
  createDocument, deleteDocChecklistItem, deleteDocument, saveDocChecklistItem, toggleDocChecklist, updateDocument,
} from "@/features/documents/actions";
import { useI18n } from "@/i18n/client";
import { useT } from "@/i18n/client";

type CheckItem = { id: string; name: string; side: string; is_done: boolean; document_id: string | null; notes: string | null };
type Doc = { id: string; title: string; category: string; file_name: string; mime_type: string; size_bytes: number; vendor_id: string | null; notes: string | null; created_at: string; vendors: { name: string } | null };

const mb = (b: number) => `${(b / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;

export function DocumentsClient({ projectId, checklist, documents, vendors, usage, canWrite }: {
  projectId: string; checklist: CheckItem[]; documents: Doc[]; vendors: { id: string; name: string }[]; usage: { used: number; quota: number }; canWrite: boolean;
}) {
  const { t, lang } = useI18n();

  const [cat, setCat] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [upload, setUpload] = useState<{ checklistId?: string; file?: File } | null>(null);
  const [editDoc, setEditDoc] = useState<Doc | null>(null);
  const [checkForm, setCheckForm] = useState<CheckItem | { side: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const docs = documents.filter((d) => !cat || d.category === cat);

  const sides = [
    { key: "pria", label: t("Pihak Pria") },
    { key: "wanita", label: t("Pihak Wanita") },
    { key: "bersama", label: t("Bersama") },
  ];

  return (
    <>
      <ProductTour id="dokumen" steps={TOURS["dokumen"]!} />
      <PageHeader tour="dokumen" title={t("Dokumen Penting")} description={t("Checklist dokumen nikah dan arsip berkas.")}
        actions={canWrite && <Button variant="dark" icon={<Upload />} onClick={() => setUpload({})}>{t("Unggah Dokumen")}</Button>} />

      <p className="mb-4 flex items-start gap-2 rounded-lg bg-plum-100 px-4 py-3 text-[13px] text-plum-800">
        <Info className="mt-0.5 size-4 shrink-0" />{" "}{t("Daftar ini bersifat umum. Persyaratan bisa berbeda, sesuaikan dengan ketentuan KUA atau Dukcapil setempat.")}</p>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {sides.map((s) => {
          const list = checklist.filter((c) => c.side === s.key);
          const done = list.filter((c) => c.is_done).length;
          return (
            <Card tour="dokumen-main" key={s.key}>
              <CardHeader title={t(s.label)} subtitle={`${done}/${list.length} lengkap`}
                action={canWrite && <Button size="icon-sm" variant="secondary" aria-label={t("Tambah dokumen {label}", { label: s.label })} onClick={() => setCheckForm({ side: s.key })}><Plus /></Button>} />
              <ProgressBar value={list.length ? done / list.length : 0} className="mb-3" />
              <ul className="flex flex-col">
                {list.map((c) => (
                  <li key={c.id} data-row-id={c.id} className="flex items-center gap-3 border-b border-neutral-200 py-2.5 last:border-0">
                    <input type="checkbox" className="size-[18px] accent-plum-600" checked={c.is_done} disabled={!canWrite}
                      onChange={(e) => toggleDocChecklist(projectId, c.id, e.target.checked)} aria-label={t(c.name)} />
                    <span className={cn("flex-1 text-sm", c.is_done && "text-neutral-400 line-through")}>{t(c.name)}</span>
                    {c.document_id && <a href={`/api/files/${c.document_id}`} target="_blank" rel="noreferrer" aria-label={t("Lihat berkas")} className="text-plum-600"><FileText className="size-4" /></a>}
                    {canWrite && (
                      <RowMenu items={[
                        { label: t("Unggah berkas"), icon: <Upload />, onClick: () => setUpload({ checklistId: c.id }) },
                        { label: t("Ubah"), icon: <Pencil />, onClick: () => setCheckForm(c) },
                        { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus item checklist ini?"), action: () => deleteDocChecklistItem(projectId, c.id) },
                      ]} />
                    )}
                  </li>
                ))}
                {list.length === 0 && <li className="py-3 text-[13px] text-neutral-500">{t("Belum ada item.")}</li>}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-lg font-semibold">{t("Arsip Berkas")}</h2>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 w-auto rounded-full" aria-label={t("Filter kategori")}>
            <option value="">{t("Semua kategori")}</option>
            {DOCUMENT_CATEGORY.map((c) => <option key={c.key} value={c.key}>{t(c.label)}</option>)}
          </Select>
          <Segmented items={[{ key: "grid", label: <LayoutGrid className="size-4" /> }, { key: "list", label: <List className="size-4" /> }]} value={view} onChange={setView} />
        </div>
        <div className="mb-4 flex items-center gap-3 text-[13px] text-neutral-600">
          <span className="tabular">{t("Penyimpanan {v1} dari {v2}", { v1: mb(usage.used), v2: mb(usage.quota) })}</span>
          <ProgressBar value={usage.used / usage.quota} className="max-w-48" />
        </div>

        {canWrite && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setUpload({ file: f }); }}
            onClick={() => setUpload({})}
            className={cn("mb-4 flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center", drag ? "border-plum-400 bg-plum-50" : "border-neutral-200 hover:bg-neutral-50")}
          >
            <Upload className="size-6 text-plum-500" />
            <span className="text-sm font-medium">{t("Tarik file ke sini atau klik untuk memilih")}</span>
            <span className="text-xs text-neutral-500">{t("PDF, JPG, PNG, WEBP · maks {MAX_FILE_MB} MB", { MAX_FILE_MB })}</span>
          </div>
        )}

        {docs.length === 0 ? (
          <EmptyState icon={<FileText />} title={t("Belum ada dokumen")} text={t("Unggah KTP, buku nikah, kontrak, dan bukti bayar.")} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {docs.map((d) => (
              <div key={d.id} data-row-id={d.id} className="flex flex-col rounded-lg border border-neutral-200 p-3">
                <div className="flex items-start justify-between">
                  <span className="inline-flex size-10 items-center justify-center rounded-md bg-plum-100 text-plum-700">{d.mime_type === "application/pdf" ? <FileText className="size-5" /> : <FileImage className="size-5" />}</span>
                  {docMenu(d)}
                </div>
                <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="mt-3 line-clamp-2 text-sm font-semibold text-neutral-800 hover:text-plum-700">{d.title}</a>
                <p className="mt-1 text-xs text-neutral-500">{t(labelOf(DOCUMENT_CATEGORY, d.category))} · {mb(d.size_bytes)}</p>
                {d.vendors && <p className="text-xs text-neutral-500">{d.vendors.name}</p>}
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {docs.map((d) => (
              <li key={d.id} data-row-id={d.id} className="flex items-center gap-3 py-3">
                {d.mime_type === "application/pdf" ? <FileText className="size-5 text-plum-600" /> : <FileImage className="size-5 text-plum-600" />}
                <div className="min-w-0 flex-1">
                  <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:text-plum-700">{d.title}</a>
                  <p className="text-xs text-neutral-500">{t(labelOf(DOCUMENT_CATEGORY, d.category))} · {mb(d.size_bytes)} · {formatDateCompact(d.created_at, undefined, lang)}</p>
                </div>
                {docMenu(d)}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {upload && (
        <UploadModal projectId={projectId} initialFile={upload.file} checklistId={upload.checklistId} checklist={checklist} vendors={vendors}
          onClose={() => setUpload(null)} />
      )}

      <Modal open={!!editDoc} onClose={() => setEditDoc(null)} title={t("Ubah Dokumen")}>
        {editDoc && (
          <ActionForm action={(fd) => updateDocument(projectId, fd)} onSuccess={() => setEditDoc(null)}>
            <input type="hidden" name="id" value={editDoc.id} />
            <DocFields vendors={vendors} doc={editDoc} />
            <FormActions><Button variant="secondary" onClick={() => setEditDoc(null)}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>

      <Modal open={!!checkForm} onClose={() => setCheckForm(null)} title={checkForm && "id" in checkForm ? t("Ubah Item Checklist") : t("Tambah Item Checklist")}>
        {checkForm && (
          <ActionForm action={(fd) => saveDocChecklistItem(projectId, fd)} onSuccess={() => setCheckForm(null)}>
            {"id" in checkForm && <input type="hidden" name="id" value={checkForm.id} />}
            <Field label={t("Nama dokumen")} htmlFor="dc-name"><Input id="dc-name" name="name" required defaultValue={"name" in checkForm ? checkForm.name : ""} /></Field>
            <Field label={t("Pihak")} htmlFor="dc-side">
              <Select id="dc-side" name="side" defaultValue={checkForm.side}>{sides.map((s) => <option key={s.key} value={s.key}>{t(s.label)}</option>)}</Select>
            </Field>
            <Field label={t("Berkas terkait")} htmlFor="dc-doc">
              <Select id="dc-doc" name="document_id" defaultValue={"document_id" in checkForm ? checkForm.document_id ?? "" : ""}>
                <option value="">{t("Belum ada")}</option>
                {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </Select>
            </Field>
            <Field label={t("Catatan")} htmlFor="dc-notes"><Textarea id="dc-notes" name="notes" defaultValue={"notes" in checkForm ? checkForm.notes ?? "" : ""} /></Field>
            <FormActions><Button variant="secondary" onClick={() => setCheckForm(null)}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>
    </>
  );

  function docMenu(d: Doc) {
    return (
      <RowMenu items={[
        { label: t("Pratinjau"), icon: <Eye />, href: `/api/files/${d.id}`, external: true },
        { label: t("Unduh"), icon: <Download />, href: `/api/files/${d.id}?unduh`, external: true },
        { label: t("Ubah"), icon: <Pencil />, hidden: !canWrite, onClick: () => setEditDoc(d) },
        { label: t("Hapus"), icon: <Trash2 />, danger: true, hidden: !canWrite, confirm: t("Hapus dokumen ini?"), action: () => deleteDocument(projectId, d.id) },
      ]} />
    );
  }
}

function DocFields({ vendors, doc, defaultCategory }: { vendors: { id: string; name: string }[]; doc?: Doc | null; defaultCategory?: string }) {
  const t = useT();
  return (
    <>
      <Field label={t("Judul")} htmlFor="d-title"><Input id="d-title" name="title" defaultValue={doc?.title} placeholder={t("KTP Raka")} /></Field>
      <FormGrid>
        <Field label={t("Kategori")} htmlFor="d-cat">
          <Select id="d-cat" name="category" defaultValue={doc?.category ?? defaultCategory ?? "lainnya"}>{DOCUMENT_CATEGORY.map((c) => <option key={c.key} value={c.key}>{t(c.label)}</option>)}</Select>
        </Field>
        <Field label={t("Vendor terkait")} htmlFor="d-vendor">
          <Select id="d-vendor" name="vendor_id" defaultValue={doc?.vendor_id ?? ""}>
            <option value="">{t("Tidak ada")}</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </Field>
      </FormGrid>
      <Field label={t("Catatan")} htmlFor="d-notes"><Textarea id="d-notes" name="notes" defaultValue={doc?.notes ?? ""} /></Field>
    </>
  );
}

function UploadModal({ projectId, initialFile, checklistId, checklist, vendors, onClose }: {
  projectId: string; initialFile?: File; checklistId?: string; checklist: CheckItem[]; vendors: { id: string; name: string }[]; onClose: () => void;
}) {
  const t = useT();
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  return (
    <Modal open onClose={onClose} title={t("Unggah Dokumen")} size="lg">
      <ActionForm
        action={async (fd) => {
          if (!file) return { ok: false, error: "Pilih file dulu." };
          try {
            const up = await uploadProjectFile(projectId, "documents", file);
            fd.set("storage_path", up.path);
            fd.set("size_bytes", String(up.size));
            fd.set("mime_type", up.mime);
            fd.set("file_name", up.fileName);
            if (!fd.get("title")) fd.set("title", file.name.replace(/\.[^.]+$/, ""));
          } catch (e) {
            return { ok: false, error: (e as Error).message };
          }
          return createDocument(projectId, fd);
        }}
        onSuccess={onClose}
      >
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-plum-200 bg-plum-50 px-4 py-5">
          <Upload className="size-6 text-plum-600" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{file ? file.name : t("Pilih file")}</span>
            <span className="text-xs text-neutral-500">{file ? mb(file.size) : t("PDF, JPG, PNG, WEBP · maks {MAX_FILE_MB} MB", { MAX_FILE_MB })}</span>
          </span>
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <DocFields vendors={vendors} defaultCategory={checklistId ? "administrasi_nikah" : undefined} />
        <Field label={t("Penuhi checklist administrasi")} htmlFor="d-check">
          <Select id="d-check" name="checklist_item_id" defaultValue={checklistId ?? ""}>
            <option value="">{t("Tidak ada")}</option>
            {checklist.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.side})</option>)}
          </Select>
        </Field>
        <FormActions><Button variant="secondary" onClick={onClose}>{t("Batal")}</Button><SubmitButton icon={<Upload />}>{t("Unggah")}</SubmitButton></FormActions>
      </ActionForm>
    </Modal>
  );
}
