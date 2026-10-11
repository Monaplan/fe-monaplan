"use client";

import { useRef, type ReactNode } from "react";
import { useConfirm } from "@/components/ui/dialogs";
import { useT } from "@/i18n/client";

// Tombol keluar dengan konfirmasi. Formulirnya tetap form biasa (POST ke /auth/signout), jadi tetap jalan tanpa JavaScript.
export function SignOutForm({ children, className }: { children: ReactNode; className?: string }) {
  const t = useT();
  const confirm = useConfirm();
  const ref = useRef<HTMLFormElement>(null);
  const ok = useRef(false);
  return (
    <form
      ref={ref}
      action="/auth/signout"
      method="post"
      className={className}
      onSubmit={async (e) => {
        if (ok.current) return;
        e.preventDefault();
        if (await confirm({ title: t("Keluar dari Monaplan?"), body: t("Kamu perlu masuk lagi untuk melanjutkan. Data kamu tetap aman."), confirmLabel: t("Keluar"), tone: "danger" })) {
          ok.current = true;
          ref.current?.submit();
        }
      }}
    >
      {children}
    </form>
  );
}
