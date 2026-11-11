"use client";

import { Children, Fragment, isValidElement, useEffect, useId, useMemo, useRef, useState, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./cn";
import { inputClass } from "./input-class";
import { AnchoredPopover } from "./anchored-popover";

// Dropdown bergaya aplikasi, pengganti <select> bawaan peramban (popup biru standarnya tidak bisa didesain).
// Pemakaiannya sama: <Select name value defaultValue onChange>{<option value>…</option>}</Select>.
// onChange menerima objek bergaya event ({ target: { value, name } }), jadi (e) => e.target.value tetap bekerja.
export type SelectChangeEvent = { target: { value: string; name: string }; currentTarget: { value: string; name: string } };

type Opt = { value: string; label: ReactNode; text: string; disabled: boolean };

// Teks polos dari sebuah simpul React, untuk pencarian ketik-cepat dan nilai opsi tanpa atribut value
function plain(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plain).join("");
  if (isValidElement(node)) return plain((node.props as { children?: ReactNode }).children);
  return "";
}

// Ambil daftar <option> dari anak-anak, termasuk yang dibungkus Fragment atau larik
function collect(children: ReactNode, out: Opt[] = []): Opt[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>;
    if (el.type === Fragment) collect(el.props.children, out);
    else if (el.type === "option") {
      const text = plain(el.props.children);
      out.push({ value: el.props.value !== undefined ? String(el.props.value) : text, label: el.props.children, text, disabled: !!el.props.disabled });
    }
  });
  return out;
}

type Props = Omit<ComponentProps<"select">, "onChange" | "value" | "defaultValue" | "children" | "multiple" | "size"> & {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: SelectChangeEvent) => void;
  children?: ReactNode;
};

export function Select({ id, name = "", value, defaultValue, onChange, children, className, disabled, required, ...rest }: Props) {
  const options = useMemo(() => collect(children), [children]);
  const [inner, setInner] = useState(defaultValue !== undefined ? String(defaultValue) : "");
  const controlled = value !== undefined;
  const wanted = controlled ? String(value) : inner;
  // Seperti <select> bawaan: nilai yang tidak cocok dengan opsi mana pun jatuh ke opsi pertama
  const matched = options.findIndex((o) => o.value === wanted);
  const selected = matched >= 0 ? matched : options.length ? 0 : -1;
  const current = selected >= 0 ? options[selected]! : null;

  const uid = useId();
  const listId = `${uid}-list`;
  const optId = (i: number) => `${uid}-opt-${i}`;
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [menuW, setMenuW] = useState(220);
  const typed = useRef({ text: "", at: 0 });

  const openMenu = () => {
    if (disabled || !options.length) return;
    const w = trigger.current?.getBoundingClientRect().width ?? 220;
    setMenuW(Math.min(Math.max(w, 180), window.innerWidth - 16));
    setActive(selected >= 0 ? selected : 0);
    setOpen(true);
  };
  const choose = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    if (!controlled) setInner(o.value);
    setOpen(false);
    trigger.current?.focus();
    if (o.value !== (current?.value ?? "")) onChange?.({ target: { value: o.value, name }, currentTarget: { value: o.value, name } });
  };
  // Geser ke opsi berikutnya yang tidak dinonaktifkan; berhenti di ujung
  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (!options[i]!.disabled) return i;
    return from;
  };
  const edge = (dir: 1 | -1) => (dir === 1 ? options.reduce((a, o, i) => (o.disabled ? a : i), 0) : Math.max(0, options.findIndex((o) => !o.disabled)));

  useEffect(() => {
    if (open) document.getElementById(optId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") { e.preventDefault(); openMenu(); return; }
    } else {
      if (k === "ArrowDown") { e.preventDefault(); setActive((a) => step(a, 1)); return; }
      if (k === "ArrowUp") { e.preventDefault(); setActive((a) => step(a, -1)); return; }
      if (k === "Home") { e.preventDefault(); setActive(edge(-1)); return; }
      if (k === "End") { e.preventDefault(); setActive(edge(1)); return; }
      if (k === "Enter" || k === " ") { e.preventDefault(); choose(active); return; }
      if (k === "Tab") { setOpen(false); return; }
    }
    // Ketik huruf untuk melompat ke opsi yang diawali huruf itu (berlaku saat terbuka maupun tertutup)
    if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && k !== " ") {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at > 700 ? "" : typed.current.text) + k.toLowerCase(), at: now };
      const from = open ? active : selected;
      const order = [...options.keys()].map((_, i) => (from + 1 + i) % options.length);
      const hit = order.find((i) => !options[i]!.disabled && options[i]!.text.toLowerCase().startsWith(typed.current.text));
      if (hit !== undefined) { e.preventDefault(); if (open) setActive(hit); else choose(hit); }
    }
  };

  return (
    <div className="relative min-w-0">
      {/* Nilai yang dikirim form; teks biasa agar atribut required tetap bekerja, disembunyikan dari tampilan */}
      <input name={name || undefined} value={current?.value ?? ""} onChange={() => {}} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-0" />
      <button
        ref={trigger} id={id} type="button" role="combobox" disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open ? optId(active) : undefined}
        aria-label={rest["aria-label"]} aria-labelledby={rest["aria-labelledby"]} aria-invalid={rest["aria-invalid"]} aria-required={required}
        onClick={() => (open ? setOpen(false) : openMenu())} onKeyDown={onKeyDown}
        className={cn(inputClass, "flex cursor-pointer items-center justify-between gap-2 pr-3 text-left", open && "border-plum-400 ring-[3px] ring-plum-100", className)}
      >
        <span className="min-w-0 flex-1 truncate">{current ? current.label : ""}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-neutral-500 transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <AnchoredPopover anchor={trigger} onClose={() => setOpen(false)} width={menuW}>
          <ul id={listId} role="listbox" aria-label={rest["aria-label"]} style={{ width: menuW }}
            className="animate-pop-in max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-surface p-1.5 shadow-pop">
            {options.map((o, i) => {
              const isSel = i === selected;
              return (
                <li key={`${o.value}-${i}`} id={optId(i)} role="option" aria-selected={isSel} aria-disabled={o.disabled || undefined}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => choose(i)} onMouseEnter={() => !o.disabled && setActive(i)}
                  className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm md:min-h-9",
                    isSel ? "font-semibold text-plum-800" : "text-neutral-800",
                    i === active && (isSel ? "bg-plum-100" : "bg-neutral-100"), i !== active && isSel && "bg-plum-50",
                    o.disabled && "cursor-not-allowed opacity-45")}>
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {isSel && <Check className="size-4 shrink-0 text-plum-600" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        </AnchoredPopover>
      )}
    </div>
  );
}
