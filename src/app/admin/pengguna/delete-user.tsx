"use client";

import { useState } from "react";
import { CircleAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { deleteUserAccount } from "@/features/admin/actions";

export function DeleteUserButton({ user, projects, isSelf }: {
  user: { id: string; email: string; full_name: string | null };
  projects: string[];
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (isSelf) return null;
  return (
    <>
      <Button size="icon-sm" variant="ghost" aria-label={`Hapus ${user.email}`} title="Hapus pengguna" className="text-danger hover:bg-danger-bg" onClick={() => setOpen(true)}>
        <Trash2 />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Hapus pengguna" description={user.full_name ? `${user.full_name} · ${user.email}` : user.email}>
        <ActionForm action={(fd) => deleteUserAccount(user.id, String(fd.get("confirm") ?? ""))} onSuccess={() => setOpen(false)}>
          <div className="flex gap-3 rounded-xl bg-danger-bg p-3 text-[13px] leading-5 text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Tindakan ini permanen dan tidak bisa dibatalkan.</p>
              <ul className="mt-1 list-disc pl-4">
                <li>Akun, profil, dan seluruh lisensinya dihapus.</li>
                <li>
                  {projects.length
                    ? <>Proyek miliknya ikut terhapus beserta semua data dan berkasnya: <b>{projects.join(", ")}</b>.</>
                    : "Pengguna ini tidak memiliki proyek."}
                </li>
                <li>Bila ia kolaborator di proyek orang lain, aksesnya dicabut.</li>
                <li>Riwayat order tetap disimpan untuk pembukuan.</li>
              </ul>
            </div>
          </div>
          <Field label={<>Ketik <b>{user.email}</b> untuk konfirmasi</>} htmlFor="del-confirm">
            <Input id="del-confirm" name="confirm" autoComplete="off" required placeholder={user.email} />
          </Field>
          <FormActions>
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <SubmitButton variant="danger" icon={<Trash2 />}>Hapus Permanen</SubmitButton>
          </FormActions>
        </ActionForm>
      </Modal>
    </>
  );
}
