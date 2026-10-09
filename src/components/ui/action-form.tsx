"use client";

import { createContext, useContext, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import type { ActionResult } from "@/lib/result";
import { Button, type ButtonVariant } from "./button";
import { useToast } from "./toast";
import { useT } from "@/i18n/client";
import { useConfirm } from "./dialogs";
import { ModalFooter } from "./modal";
import { cn } from "./cn";

const PendingCtx = createContext(false);
const FormIdCtx = createContext<string | undefined>(undefined);

export function ActionForm({ action, children, onSuccess, className, successMessage, reset }: {
  action: (fd: FormData) => Promise<ActionResult>;
  children: ReactNode;
  onSuccess?: (res: ActionResult) => void;
  className?: string;
  successMessage?: string;
  reset?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const t = useT();
  const ref = useRef<HTMLFormElement>(null);
  const formId = useId();

  return (
    <PendingCtx.Provider value={pending}>
    <FormIdCtx.Provider value={formId}>
      <form
        ref={ref}
        id={formId}
        className={cn("flex flex-col gap-5", className)}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null);
          start(async () => {
            const res = await action(fd);
            if (res.ok) {
              const msg = res.message ?? successMessage;
              if (msg) toast(msg);
              if (reset) ref.current?.reset();
              onSuccess?.(res);
            } else {
              setError(res.error);
            }
          });
        }}
      >
        {children}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-bg px-3.5 py-2.5 text-[13px] leading-5 text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" /> {t(error)}
          </p>
        )}
      </form>
    </FormIdCtx.Provider>
    </PendingCtx.Provider>
  );
}

export function SubmitButton({ children, variant = "primary", className, icon, size }: { children: ReactNode; variant?: ButtonVariant; className?: string; icon?: ReactNode; size?: "sm" | "md" | "lg" }) {
  const pending = useContext(PendingCtx);
  const formId = useContext(FormIdCtx);
  // Atribut form menjaga tombol tetap terhubung walau dirender di footer modal (di luar elemen <form>)
  return (
    <Button type="submit" form={formId} variant={variant} loading={pending} icon={icon} size={size} className={className}>
      {children}
    </Button>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <ModalFooter>{children}</ModalFooter>;
}

// Tombol untuk satu aksi server dengan konfirmasi opsional
export function ActionButton({ action, confirmText, children, variant = "ghost", size = "sm", icon, className, successMessage, title }: {
  action: () => Promise<ActionResult>;
  confirmText?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "icon" | "icon-sm";
  icon?: ReactNode;
  className?: string;
  successMessage?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();
  return (
    <Button
      variant={variant}
      size={size}
      icon={icon}
      loading={pending}
      className={className}
      aria-label={title}
      title={title}
      onClick={async () => {
        const danger = variant === "danger" || /hapus|cabut|keluar|arsip/i.test(confirmText ?? "");
        if (confirmText && !(await confirm({ title: confirmText, tone: danger ? "danger" : "default", confirmLabel: typeof children === "string" ? children : title ?? "Lanjutkan" }))) return;
        start(async () => {
          const res = await action();
          if (res.ok) {
            const msg = res.message ?? successMessage;
            if (msg) toast(msg);
          } else toast(res.error, "danger");
        });
      }}
    >
      {children}
    </Button>
  );
}
