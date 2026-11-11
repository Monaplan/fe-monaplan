"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, QrCode, Search, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { DateField } from "@/components/ui/date-field";
import { Modal } from "@/components/ui/modal";
import { ActionButton, ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusPill } from "@/components/ui/pill";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { QrImage } from "@/components/app/qr-image";
import { createShortLink, deleteShortLink, toggleShortLink, updateShortLink } from "@/features/admin/link-actions";
import { linkState, normalizeSlug, randomSlug, shortUrl } from "@/lib/links";
import { formatDateCompact } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export type ShortLinkItem = {
  id: string; slug: string; target_url: string; title: string | null; is_active: boolean; expires_at: string | null;
  click_count: number; last_clicked_at: string | null; created_at: string;
};

const tomorrowWib = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(Date.now() + 86_400_000));
const wibDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(iso));

export function ShortlinkClient({ links, base, disabled }: { links: ShortLinkItem[]; base: string; disabled: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<{ open: boolean; link: ShortLinkItem | null }>({ open: false, link: null });
  const [share, setShare] = useState<{ slug: string; title: string | null } | null>(null);
  const [, start] = useTransition();
  const now = Date.now();

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return links.filter((l) => !needle || [l.slug, l.title, l.target_url].some((x) => x?.toLowerCase().includes(needle)));
  }, [links, q]);

  const toggle = (l: ShortLinkItem, next: boolean) =>
    start(async () => {
      const r = await toggleShortLink(l.id, next);
      if (r.ok) { toast(r.message ?? t("Tersimpan.")); router.refresh(); } else toast(r.error, "danger");
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Cari slug, judul, atau tujuan")} aria-label={t("Cari shortlink")} className="pl-9" />
        </div>
        <Button variant="dark" icon={<Plus />} disabled={disabled} onClick={() => setForm({ open: true, link: null })}>{t("Buat Shortlink")}</Button>
      </div>

      <Card className="p-0 sm:p-0">
        {list.length === 0 && (
          <p className="px-5 py-10 text-center text-[13px] text-neutral-500">{links.length === 0 ? t("Belum ada shortlink. Buat yang pertama.") : t("Tidak ada shortlink yang cocok dengan pencarian.")}</p>
        )}
        {list.map((l) => {
          const state = linkState(l, now);
          const full = shortUrl(base, l.slug);
          return (
            <div key={l.id} className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 last:border-0 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <code className="tabular rounded-md bg-plum-50 px-2 py-0.5 text-[13px] font-semibold text-plum-800">{full.replace(/^https?:\/\//, "")}</code>
                  {state === "active" && <StatusPill tone="positive">{t("Aktif")}</StatusPill>}
                  {state === "inactive" && <StatusPill tone="neutral">{t("Nonaktif")}</StatusPill>}
                  {state === "expired" && <StatusPill tone="caution">{t("Kedaluwarsa")}</StatusPill>}
                </div>
                {l.title && <p className="mt-1 truncate text-sm font-medium">{l.title}</p>}
                <a href={l.target_url} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-neutral-500 hover:text-plum-700">
                  <ExternalLink className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{l.target_url}</span>
                </a>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {[l.expires_at && t("Berlaku sampai {date}", { date: formatDateCompact(l.expires_at, undefined, lang) }), l.last_clicked_at && t("Klik terakhir {date}", { date: formatDateCompact(l.last_clicked_at, undefined, lang) })].filter(Boolean).join(" · ")}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 md:justify-end">
                <div className="text-right">
                  <p className="tabular text-lg leading-6 font-semibold">{l.click_count.toLocaleString("id-ID")}</p>
                  <p className="text-xs text-neutral-500">{t("klik")}</p>
                </div>
                <div className="flex items-center">
                  <Switch label={t("Aktifkan {slug}", { slug: l.slug })} checked={l.is_active} onChange={(v) => toggle(l, v)} className="mr-2" />
                  <CopyButton value={full} label={t("Salin tautan")} message={t("Tautan disalin.")} />
                  <Button variant="ghost" size="icon-sm" title={t("Kode QR")} aria-label={t("Kode QR")} onClick={() => setShare({ slug: l.slug, title: l.title })}><QrCode /></Button>
                  <Button variant="ghost" size="icon-sm" title={t("Ubah")} aria-label={t("Ubah")} onClick={() => setForm({ open: true, link: l })}><Pencil /></Button>
                  <ActionButton size="icon-sm" variant="ghost" title={t("Hapus")} icon={<Trash2 />} confirmText={t("Hapus shortlink {slug}? Tautan yang sudah tersebar akan berhenti bekerja.", { slug: l.slug })} action={() => deleteShortLink(l.id)} />
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      <Modal open={form.open} onClose={() => setForm({ open: false, link: null })} title={form.link ? t("Ubah Shortlink") : t("Buat Shortlink")}>
        {form.open && (
          <LinkForm key={form.link?.id ?? "baru"} link={form.link} base={base} onClose={() => setForm({ open: false, link: null })}
            onDone={(r) => { setForm({ open: false, link: null }); router.refresh(); if (r.ok && r.data?.slug && !form.link) setShare({ slug: r.data.slug, title: null }); }} />
        )}
      </Modal>

      <Modal open={!!share} onClose={() => setShare(null)} title={t("Bagikan shortlink")} description={share?.title ?? undefined}>
        {share && (
          <div className="flex flex-col items-center gap-4">
            <QrImage value={shortUrl(base, share.slug)} label={t("Kode QR untuk {slug}", { slug: share.slug })} className="size-56 p-2 shadow-card" />
            <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-plum-50 px-4 py-3">
              <code className="tabular min-w-0 flex-1 truncate text-[14px] font-semibold text-plum-800">{shortUrl(base, share.slug)}</code>
              <CopyButton value={shortUrl(base, share.slug)} label={t("Salin tautan")} variant="outline" size="md" message={t("Tautan disalin.")}>{t("Salin")}</CopyButton>
            </div>
            <p className="text-center text-[12.5px] leading-5 text-neutral-500">{t("Pindai QR dengan kamera HP untuk mencoba. Klik dari pindai ini ikut terhitung.")}</p>
          </div>
        )}
      </Modal>
    </>
  );
}

function LinkForm({ link, base, onClose, onDone }: { link: ShortLinkItem | null; base: string; onClose: () => void; onDone: (r: Parameters<NonNullable<React.ComponentProps<typeof ActionForm>["onSuccess"]>>[0]) => void }) {
  const { t } = useI18n();
  const editing = !!link;
  const [slug, setSlug] = useState(link?.slug ?? "");
  const preview = normalizeSlug(slug);
  return (
    <ActionForm action={editing ? updateShortLink : createShortLink} onSuccess={onDone}>
      {editing && <input type="hidden" name="id" value={link.id} />}
      <Field label={t("Slug")} htmlFor="sl-slug"
        help={editing ? t("Slug tidak bisa diubah supaya QR dan tautan yang sudah tersebar tidak putus.") : preview ? shortUrl(base, preview) : t("Kosongkan untuk slug acak. Huruf kecil, angka, dan tanda hubung.")}>
        <div className="flex gap-2">
          <Input id="sl-slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} readOnly={editing} disabled={editing} maxLength={60} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="promo-akhir-tahun" />
          {!editing && <Button variant="outline" icon={<Shuffle />} onClick={() => setSlug(randomSlug(6))} title={t("Slug acak")} aria-label={t("Slug acak")} className="shrink-0">{t("Acak")}</Button>}
        </div>
      </Field>
      <Field label={t("Tujuan")} htmlFor="sl-target" help={t("Alamat lengkap tujuan. Contoh: https://lynk.id/monaplan")}>
        <Input id="sl-target" name="target_url" required inputMode="url" maxLength={2000} defaultValue={link?.target_url ?? ""} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="https://" />
      </Field>
      <Field label={t("Judul (opsional)")} htmlFor="sl-title" help={t("Hanya untuk penanda di daftar ini.")}>
        <Input id="sl-title" name="title" maxLength={120} defaultValue={link?.title ?? ""} autoComplete="off" />
      </Field>
      <Field label={t("Berlaku sampai (opsional)")} htmlFor="sl-exp" help={t("Setelah tanggal ini tautan mengarah ke beranda. Kosongkan bila tanpa batas.")}>
        <DateField id="sl-exp" name="expires_on" min={tomorrowWib()} defaultValue={link?.expires_at ? wibDay(link.expires_at) : ""} />
      </Field>
      <FormActions><Button variant="secondary" onClick={onClose}>{t("Batal")}</Button><SubmitButton>{editing ? t("Simpan") : t("Buat Shortlink")}</SubmitButton></FormActions>
    </ActionForm>
  );
}

