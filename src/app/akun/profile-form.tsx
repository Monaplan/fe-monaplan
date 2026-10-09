"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/inputs";
import { deleteAccount, updateProfile } from "@/features/account/actions";
import { useT } from "@/i18n/client";

export function ProfileForm({ fullName, phone, notifyEmail }: { fullName: string; phone: string; notifyEmail: boolean }) {
  const t = useT();
  return (
    <ActionForm action={updateProfile}>
      <Field label={t("Nama")} htmlFor="acc-name"><Input id="acc-name" name="full_name" defaultValue={fullName} /></Field>
      <Field label={t("Nomor HP (opsional)")} htmlFor="acc-phone"><PhoneInput id="acc-phone" name="phone" defaultValue={phone.replace(/^62/, "")} /></Field>
      <label className="flex items-center gap-2 text-sm"><Checkbox name="notify_email" defaultChecked={notifyEmail} />{t("Kirim pengingat lewat email")}</label>
      <div><SubmitButton>{t("Simpan")}</SubmitButton></div>
    </ActionForm>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <ActionForm action={deleteAccount} onSuccess={() => router.push("/")} className="sm:flex-row">
      <Input name="confirm" placeholder={email} aria-label={t("Ketik email untuk konfirmasi")} required />
      <SubmitButton variant="danger" icon={<Trash2 />}>{t("Hapus Akun")}</SubmitButton>
    </ActionForm>
  );
}
