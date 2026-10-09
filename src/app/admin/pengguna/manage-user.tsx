"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Hourglass, Infinity as InfinityIcon, RotateCcw, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { useConfirm, usePrompt } from "@/components/ui/dialogs";
import { setUserAccess, setUserRole, type UserAccessOp } from "@/features/admin/config-actions";
import type { LicenseStateKey } from "@/lib/access";

export type ManagedUser = { id: string; email: string; full_name: string | null; role: "user" | "admin" };

export function ManageUserButton({ user, access, isSelf, defaultTrialDays }: {
  user: ManagedUser;
  access: { state: LicenseStateKey; label: string; isTrial: boolean };
  isSelf: boolean;
  defaultTrialDays: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(user.role);
  const [days, setDays] = useState(String(defaultTrialDays));
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast(r.message ?? "Tersimpan."); router.refresh(); }
      else toast(r.error ?? "Gagal.", "danger");
    });
  const access$ = (input: UserAccessOp) => run(() => setUserAccess(user.id, input));

  const hasForever = access.state === "lifetime";
  const canRevoke = access.state === "lifetime" || access.state === "timed" || access.state === "expired";

  return (
    <>
      <Button size="icon-sm" variant="ghost" aria-label={`Kelola ${user.email}`} title="Kelola peran dan akses" onClick={() => { setRole(user.role); setOpen(true); }}>
        <UserCog />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Kelola pengguna" description={user.full_name ? `${user.full_name} · ${user.email}` : user.email}>
        <div className="flex flex-col gap-6">
          <section aria-labelledby="mu-role">
            <h3 id="mu-role" className="text-[13px] font-semibold text-neutral-900">Peran akun</h3>
            <p className="mt-1 text-[13px] leading-5 text-neutral-600">Admin bisa membuka panel ini dan mengelola semua pengguna. Beri hanya kepada orang yang dipercaya.</p>
            <div className="mt-3 flex items-end gap-2">
              <Field label="Peran" htmlFor="mu-role-select" className="flex-1">
                <Select id="mu-role-select" value={role} onChange={(e) => setRole(e.target.value as "user" | "admin")} disabled={isSelf}>
                  <option value="user">Pengguna</option>
                  <option value="admin">Admin</option>
                </Select>
              </Field>
              <Button variant="dark" loading={pending} disabled={isSelf || role === user.role} onClick={() => run(() => setUserRole(user.id, role))}>Simpan</Button>
            </div>
            {isSelf && <p className="mt-2 text-xs text-neutral-500">Kamu tidak bisa mengubah perananmu sendiri.</p>}
          </section>

          <section aria-labelledby="mu-access" className="border-t border-neutral-200 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 id="mu-access" className="text-[13px] font-semibold text-neutral-900">Akses aplikasi</h3>
              <StatusPill tone={access.state === "lifetime" || access.state === "timed" ? "positive" : access.state === "revoked" ? "danger" : "neutral"}>
                {access.isTrial && access.state !== "revoked" ? `Trial · ${access.label}` : access.label}
              </StatusPill>
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              <Button variant="secondary" icon={<InfinityIcon />} className="justify-start" loading={pending} disabled={hasForever}
                onClick={async () => { if (await confirm({ title: "Beri akses selamanya?", body: `${user.email} langsung bisa memakai semua fitur tanpa batas waktu.`, confirmLabel: "Beri akses" })) access$({ op: "lifetime" }); }}>
                Beri akses selamanya
              </Button>

              <div className="flex items-end gap-2">
                <Field label="Beri trial (hari)" htmlFor="mu-trial" className="flex-1">
                  <Input id="mu-trial" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} disabled={hasForever} />
                </Field>
                <Button variant="secondary" icon={<Hourglass />} loading={pending} disabled={hasForever} onClick={() => access$({ op: "trial", days: Number(days) })}>Beri trial</Button>
              </div>

              {access.state === "revoked" ? (
                <Button variant="secondary" icon={<RotateCcw />} className="justify-start" loading={pending} onClick={() => access$({ op: "restore" })}>Pulihkan akses yang dicabut</Button>
              ) : (
                <Button variant="outline" icon={<Ban />} className="justify-start text-danger" loading={pending} disabled={!canRevoke}
                  onClick={async () => {
                    const reason = await prompt({ title: "Cabut akses?", body: `Akses ${user.email} langsung berhenti dan ruang kerjanya menjadi baca-saja. Bisa dipulihkan lagi.`, label: "Alasan pencabutan", type: "textarea", tone: "danger", confirmLabel: "Cabut akses", placeholder: "Contoh: refund atas permintaan pengguna" });
                    if (reason) access$({ op: "revoke", reason });
                  }}>
                  Cabut akses
                </Button>
              )}
            </div>
          </section>
        </div>
      </Modal>
    </>
  );
}
