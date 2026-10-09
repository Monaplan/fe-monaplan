import type { ComponentProps, ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "./cn";

export const inputClass =
  "h-10 w-full rounded-[12px] border border-neutral-200 bg-surface px-3.5 text-sm text-neutral-900 shadow-[0_1px_2px_rgba(62,26,45,0.04)] placeholder:text-neutral-400 outline-none transition-[border-color,box-shadow] duration-150 hover:border-neutral-300 focus:border-plum-400 focus:ring-[3px] focus:ring-plum-100 disabled:bg-neutral-50 disabled:text-neutral-500 aria-[invalid=true]:border-danger";

export function Field({ label, htmlFor, help, error, children, className }: { label?: ReactNode; htmlFor?: string; help?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && <label htmlFor={htmlFor} className="text-[13px] font-medium text-neutral-800">{label}</label>}
      {children}
      {help && !error && <p className="text-[13px] leading-5 text-neutral-500">{help}</p>}
      {error && <p className="flex items-center gap-1 text-[13px] text-danger"><CircleAlert className="size-3.5" />{error}</p>}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-[88px] py-2 leading-[22px]", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "pr-8", className)} {...rest}>{children}</select>;
}

export function Checkbox({ className, ...rest }: ComponentProps<"input">) {
  return <input type="checkbox" className={cn("size-[18px] shrink-0 cursor-pointer rounded-sm accent-plum-600", className)} {...rest} />;
}

export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  return <div className={cn("grid gap-x-4 gap-y-5", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-3")}>{children}</div>;
}
