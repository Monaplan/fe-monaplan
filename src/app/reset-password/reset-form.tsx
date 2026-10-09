"use client";

import { useRouter } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field } from "@/components/ui/form";
import { updatePassword } from "@/features/auth/actions";
import { PasswordInput } from "../login/auth-form";

export function ResetForm() {
  const router = useRouter();
  return (
    <ActionForm action={updatePassword} onSuccess={() => setTimeout(() => router.push("/mulai"), 800)}>
      <Field label="Password baru" htmlFor="rp-pass" help="Minimal 8 karakter."><PasswordInput id="rp-pass" name="password" autoComplete="new-password" /></Field>
      <Field label="Ulangi password baru" htmlFor="rp-pass2"><PasswordInput id="rp-pass2" name="password_confirm" autoComplete="new-password" /></Field>
      <SubmitButton size="lg" className="w-full">Simpan Password</SubmitButton>
    </ActionForm>
  );
}
