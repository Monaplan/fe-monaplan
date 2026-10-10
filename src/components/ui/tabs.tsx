import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

export function Segmented<T extends string>({ items, value, onChange, className, fullWidth }: {
  items: { key: T; label: ReactNode }[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <div role="tablist" className={cn(fullWidth ? "flex w-full" : "inline-flex max-w-full overflow-x-auto", "rounded-full bg-neutral-100 p-1", className)}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={value === it.key}
          onClick={() => onChange(it.key)}
          className={cn(
            fullWidth ? "h-10 flex-1 md:h-9" : "h-10 shrink-0 md:h-8", "rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors",
            value === it.key ? "border border-neutral-200 bg-surface text-neutral-900" : "text-neutral-600 hover:text-neutral-900",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function LinkTabs({ items, className }: { items: { href: string; label: ReactNode; active: boolean }[]; className?: string }) {
  return (
    <div className={cn("inline-flex max-w-full overflow-x-auto rounded-full bg-neutral-100 p-1", className)}>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          scroll={false}
          className={cn(
            "inline-flex h-10 shrink-0 items-center rounded-full px-3.5 md:h-8 text-[13px] font-medium whitespace-nowrap",
            it.active ? "border border-neutral-200 bg-surface text-neutral-900" : "text-neutral-600 hover:text-neutral-900",
          )}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}
