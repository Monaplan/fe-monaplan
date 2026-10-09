"use client";

import { cn } from "./cn";

// Saklar hidup-mati (role=switch). Untuk pengaturan yang langsung berlaku, bukan isian formulir.
export function Switch({ checked, onChange, disabled, label, className }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-plum-200 disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-plum-600" : "bg-neutral-300",
        className,
      )}
    >
      <span className={cn("inline-block size-[18px] rounded-full bg-white shadow-sm transition-transform duration-150", checked ? "translate-x-[23px]" : "translate-x-[3px]")} />
    </button>
  );
}
