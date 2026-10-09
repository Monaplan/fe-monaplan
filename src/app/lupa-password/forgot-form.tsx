"use client";

import { useState } from "react";
import { Mail, MailCheck } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field } from "@/components/ui/form";
import { requestPasswordReset } from "@/features/auth/actions";
import { IconInput } from "../login/auth-form";

export function ForgotForm() {
  const [sent, setSent] = useState<string | null>(null);
  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-plum-100 bg-plum-50 p-4 text-[13px] leading-5 text-plum-800">
        <MailCheck className="mt-0.5 size-5 shrink-0" />{sent}
      </div>
    );
  }
  return (
    <ActionForm action={requestPasswordReset} onSuccess={(r) => r.ok && setSent(r.message ?? "Cek email kamu.")}>
      <Field label="Email" htmlFor="fp-email"><IconInput icon={<Mail />} id="fp-email" name="email" type="email" required autoComplete="email" placeholder="nama@email.com" /></Field>
      <SubmitButton size="lg" className="w-full">Kirim Tautan Reset</SubmitButton>
    </ActionForm>
  );
}
