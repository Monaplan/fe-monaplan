"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { usePrompt } from "@/components/ui/dialogs";
import { formatDateCompact } from "@/lib/format";
import { deleteLicense, extendLicense, grantLicense, restoreLicense, revokeLicense } from "@/features/admin/actions";
import { useT } from "@/i18n/client";
import { useI18n } from "@/i18n/client";

const SOURCE: Record<string, string> = { payment: "Dibayar", access_code: "Kode akses", admin_grant: "Admin", trial: "Trial" };

export function GrantLicenseButton({ plans }: { plans: { id: string; name: string }[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="dark" icon={<Plus />} onClick={() => setOpen(true)}>{t("Beri Lisensi")}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("Beri Lisensi Manual")}>
        <ActionForm action={grantLicense} onSuccess={() => setOpen(false)}>
          <Field label={t("Email pengguna")} htmlFor="gl-email" help={t("Pengguna harus sudah pernah login.")}><Input id="gl-email" type="email" name="email" required /></Field>
          <Field label={t("Paket")} htmlFor="gl-plan"><Select id="gl-plan" name="plan_id">{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label={t("Alasan")} htmlFor="gl-reason"><Input id="gl-reason" name="reason" placeholder={t("Kompensasi kendala pembayaran")} /></Field>
          <FormActions><Button variant="secondary" onClick={() => setOpen(false)}>{t("Batal")}</Button><SubmitButton>{t("Beri Lisensi")}</SubmitButton></FormActions>
        </ActionForm>
      </Modal>
    </>
  );
}

export function LicenseRow({ license: l }: { license: any }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const prompt = usePrompt();
  const [, start] = useTransition();
  const ended = l.ends_at && Date.parse(l.ends_at) < Date.now();
  const run = (fn: () => Promise<any>) => start(async () => { const r = await fn(); r.ok ? toast(r.message) : toast(r.error, "danger"); });
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-neutral-200 px-5 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{l.profiles?.email}</p>
        <p className="text-xs text-neutral-500">{l.plans?.name} · {t(SOURCE[l.source]!)} · {t("{start} sampai {end}", { start: formatDateCompact(l.starts_at, undefined, lang), end: l.ends_at ? formatDateCompact(l.ends_at, undefined, lang) : t("selamanya") })}{l.revoked_reason && ` · ${l.revoked_reason}`}</p>
      </div>
      {l.status === "revoked" ? <StatusPill tone="danger">{t("Dicabut")}</StatusPill> : ended ? <StatusPill>{t("Berakhir")}</StatusPill> : <StatusPill tone="positive">{t("Aktif")}</StatusPill>}
      <RowMenu items={[
        { label: t("Perpanjang 30 hari"), hidden: !l.ends_at || l.status === "revoked", onClick: () => run(() => extendLicense(l.id, 30)) },
        { label: t("Perpanjang…"), hidden: !l.ends_at || l.status === "revoked", onClick: async () => {
          const d = await prompt({ title: t("Perpanjang lisensi"), body: t("{email} · berakhir {date}", { email: l.profiles?.email, date: formatDateCompact(l.ends_at, undefined, lang) }), label: t("Tambah berapa hari?"), type: "number", defaultValue: "365", min: 1, max: 3650, confirmLabel: t("Perpanjang") });
          if (d) run(() => extendLicense(l.id, Number(d)));
        } },
        { label: t("Cabut"), danger: true, hidden: l.status === "revoked", onClick: async () => {
          const r = await prompt({ title: t("Cabut lisensi"), body: t("Akses {email} langsung berhenti dan halaman RSVP tamunya ditutup. Lisensi bisa dipulihkan lagi nanti.", { email: l.profiles?.email }), label: t("Alasan pencabutan"), type: "textarea", placeholder: t("Contoh: refund atas permintaan pengguna"), tone: "danger", confirmLabel: t("Cabut Lisensi") });
          if (r) run(() => revokeLicense(l.id, r));
        } },
        { label: t("Pulihkan"), hidden: l.status !== "revoked", action: () => restoreLicense(l.id) },
        { label: t("Hapus"), icon: <Trash2 />, danger: true, hidden: l.status !== "revoked", confirm: t("Hapus lisensi {email} secara permanen? Order terkait tetap tersimpan.", { email: l.profiles?.email }), action: () => deleteLicense(l.id) },
      ]} />
    </div>
  );
}
