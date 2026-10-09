"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleHelp } from "lucide-react";
import { Modal, ModalFooter } from "./modal";
import { Button } from "./button";
import { Field, Input, Textarea } from "./form";
import { cn } from "./cn";

// Pengganti window.confirm / window.prompt: modal bergaya aplikasi yang mengembalikan Promise.

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};
export type PromptOptions = {
  title: string;
  body?: ReactNode;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  type?: "text" | "number" | "textarea";
  required?: boolean;
  min?: number;
  max?: number;
  confirmLabel?: string;
  tone?: "danger" | "default";
};

type Pending =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOptions; resolve: (v: string | null) => void };

const Ctx = createContext<{ confirm: (o: ConfirmOptions | string) => Promise<boolean>; prompt: (o: PromptOptions) => Promise<string | null> } | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((o: ConfirmOptions | string) =>
    new Promise<boolean>((resolve) => setPending({ kind: "confirm", opts: typeof o === "string" ? { title: o } : o, resolve })), []);
  const prompt = useCallback((o: PromptOptions) =>
    new Promise<string | null>((resolve) => setPending({ kind: "prompt", opts: o, resolve })), []);

  const close = (value: boolean | string | null) => {
    if (!pending) return;
    if (pending.kind === "confirm") pending.resolve(value === true);
    else pending.resolve(typeof value === "string" ? value : null);
    setPending(null);
  };

  return (
    <Ctx.Provider value={{ confirm, prompt }}>
      {children}
      {pending?.kind === "confirm" && <ConfirmDialog opts={pending.opts} onClose={close} />}
      {pending?.kind === "prompt" && <PromptDialog opts={pending.opts} onClose={close} />}
    </Ctx.Provider>
  );
}

function ToneIcon({ tone }: { tone?: "danger" | "default" }) {
  return (
    <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
      tone === "danger" ? "bg-danger-bg text-danger" : "bg-plum-50 text-plum-600 ring-1 ring-plum-100")}>
      {tone === "danger" ? <CircleAlert /> : <CircleHelp />}
    </span>
  );
}

function ConfirmDialog({ opts, onClose }: { opts: ConfirmOptions; onClose: (v: boolean) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <Modal open onClose={() => onClose(false)} title={opts.title} hideHeader>
      <div className="flex gap-4">
        <ToneIcon tone={opts.tone} />
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-[17px] font-semibold text-neutral-900">{opts.title}</h2>
          {opts.body && <div className="mt-1.5 text-[13.5px] leading-[22px] text-neutral-600">{opts.body}</div>}
        </div>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={() => onClose(false)}>{opts.cancelLabel ?? "Batal"}</Button>
        <Button ref={ref} variant={opts.tone === "danger" ? "danger" : "primary"} onClick={() => onClose(true)}>{opts.confirmLabel ?? "Lanjutkan"}</Button>
      </ModalFooter>
    </Modal>
  );
}

function PromptDialog({ opts, onClose }: { opts: PromptOptions; onClose: (v: string | null) => void }) {
  const [value, setValue] = useState(opts.defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const formId = useId();
  const submit = () => {
    const v = value.trim();
    if ((opts.required ?? true) && !v) return setError("Wajib diisi.");
    if (opts.type === "number") {
      const n = Number(v);
      if (!Number.isFinite(n) || (opts.min != null && n < opts.min) || (opts.max != null && n > opts.max)) {
        return setError(`Masukkan angka${opts.min != null ? ` ${opts.min}` : ""}${opts.max != null ? ` sampai ${opts.max}` : ""}.`);
      }
    }
    onClose(v);
  };
  return (
    <Modal open onClose={() => onClose(null)} title={opts.title} hideHeader>
      <form id={formId} onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="flex gap-4">
          <ToneIcon tone={opts.tone} />
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[17px] font-semibold text-neutral-900">{opts.title}</h2>
            {opts.body && <div className="mt-1.5 text-[13.5px] leading-[22px] text-neutral-600">{opts.body}</div>}
          </div>
        </div>
        <Field label={opts.label} htmlFor="prompt-input" error={error} className="mt-5">
          {opts.type === "textarea" ? (
            <Textarea id="prompt-input" autoFocus value={value} placeholder={opts.placeholder} onChange={(e) => { setValue(e.target.value); setError(null); }} />
          ) : (
            <Input id="prompt-input" autoFocus type={opts.type === "number" ? "number" : "text"} inputMode={opts.type === "number" ? "numeric" : undefined}
              min={opts.min} max={opts.max} value={value} placeholder={opts.placeholder} onChange={(e) => { setValue(e.target.value); setError(null); }} />
          )}
        </Field>
      </form>
      <ModalFooter>
        <Button variant="secondary" onClick={() => onClose(null)}>Batal</Button>
        <Button type="submit" form={formId} variant={opts.tone === "danger" ? "danger" : "primary"}>{opts.confirmLabel ?? "Simpan"}</Button>
      </ModalFooter>
    </Modal>
  );
}

export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error("DialogProvider belum dipasang");
  return c.confirm;
}
export function usePrompt() {
  const c = useContext(Ctx);
  if (!c) throw new Error("DialogProvider belum dipasang");
  return c.prompt;
}
