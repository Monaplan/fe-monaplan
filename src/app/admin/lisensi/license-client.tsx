"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { usePrompt } from "@/components/ui/dialogs";
import { formatDateCompact } from "@/lib/format";
import { extendLicense, grantLicense, restoreLicense, revokeLicense } from "@/features/admin/actions";

const SOURCE: Record<string, string> = { payment: "Pembayaran", access_code: "Kode akses", admin_grant: "Admin", trial: "Trial" };

export function GrantLicenseButton({ plans }: { plans: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="dark" icon={<Plus />} onClick={() => setOpen(true)}>Beri Lisensi</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Beri Lisensi Manual">
        <ActionForm action={grantLicense} onSuccess={() => setOpen(false)}>
          <Field label="Email pengguna" htmlFor="gl-email" help="Pengguna harus sudah pernah login."><Input id="gl-email" type="email" name="email" required /></Field>
          <Field label="Paket" htmlFor="gl-plan"><Select id="gl-plan" name="plan_id">{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Alasan" htmlFor="gl-reason"><Input id="gl-reason" name="reason" placeholder="Kompensasi kendala pembayaran" /></Field>
          <FormActions><Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button><SubmitButton>Beri Lisensi</SubmitButton></FormActions>
        </ActionForm>
      </Modal>
    </>
  );
}

export function LicenseRow({ license: l }: { license: any }) {
  const toast = useToast();
  const prompt = usePrompt();
  const [, start] = useTransition();
  const ended = l.ends_at && Date.parse(l.ends_at) < Date.now();
  const run = (fn: () => Promise<any>) => start(async () => { const r = await fn(); r.ok ? toast(r.message) : toast(r.error, "danger"); });
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-neutral-200 px-5 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{l.profiles?.email}</p>
        <p className="text-xs text-neutral-500">{l.plans?.name} · {SOURCE[l.source]} · {formatDateCompact(l.starts_at)} sampai {l.ends_at ? formatDateCompact(l.ends_at) : "selamanya"}{l.revoked_reason && ` · ${l.revoked_reason}`}</p>
      </div>
      {l.status === "revoked" ? <StatusPill tone="danger">Dicabut</StatusPill> : ended ? <StatusPill>Berakhir</StatusPill> : <StatusPill tone="positive">Aktif</StatusPill>}
      <RowMenu items={[
        { label: "Perpanjang 30 hari", hidden: !l.ends_at || l.status === "revoked", onClick: () => run(() => extendLicense(l.id, 30)) },
        { label: "Perpanjang…", hidden: !l.ends_at || l.status === "revoked", onClick: async () => {
          const d = await prompt({ title: "Perpanjang lisensi", body: `${l.profiles?.email} · berakhir ${formatDateCompact(l.ends_at)}`, label: "Tambah berapa hari?", type: "number", defaultValue: "365", min: 1, max: 3650, confirmLabel: "Perpanjang" });
          if (d) run(() => extendLicense(l.id, Number(d)));
        } },
        { label: "Cabut", danger: true, hidden: l.status === "revoked", onClick: async () => {
          const r = await prompt({ title: "Cabut lisensi", body: `Akses ${l.profiles?.email} langsung berhenti dan halaman RSVP tamunya ditutup. Lisensi bisa dipulihkan lagi nanti.`, label: "Alasan pencabutan", type: "textarea", placeholder: "Contoh: refund atas permintaan pengguna", tone: "danger", confirmLabel: "Cabut Lisensi" });
          if (r) run(() => revokeLicense(l.id, r));
        } },
        { label: "Pulihkan", hidden: l.status !== "revoked", action: () => restoreLicense(l.id) },
      ]} />
    </div>
  );
}
