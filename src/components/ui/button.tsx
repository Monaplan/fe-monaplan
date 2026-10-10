import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "dark" | "secondary" | "outline" | "ghost" | "danger" | "white";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-plum-600 text-white shadow-btn hover:bg-plum-700 dark:hover:bg-plum-600 dark:hover:brightness-110",
  dark: "bg-plum-900 text-white shadow-btn hover:bg-plum-800 dark:bg-plum-600 dark:hover:bg-plum-600 dark:hover:brightness-110",
  secondary: "bg-neutral-100 text-neutral-800 hover:bg-neutral-200",
  outline: "bg-surface border border-neutral-200 text-neutral-800 shadow-[0_1px_2px_rgba(62,26,45,0.05)] hover:border-neutral-300 hover:bg-neutral-50",
  ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100",
  danger: "bg-danger-solid text-white shadow-btn hover:brightness-95 dark:hover:brightness-110",
  // Selalu putih: dipakai di atas latar gradasi plum gelap (kartu status akses)
  white: "bg-[#FFFFFF] text-[#3E1A2D] hover:bg-[#FBF5F8]",
};
const SIZE: Record<ButtonSize, string> = {
  sm: "h-10 px-3.5 text-[13px] gap-1.5 md:h-8 md:px-3",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2",
  icon: "h-10 w-10 justify-center",
  "icon-sm": "h-10 w-10 justify-center md:h-8 md:w-8",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,filter] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode; loading?: boolean };

export function Button({ variant, size, icon, loading, className, children, disabled, type = "button", ...rest }: Common & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, icon, className, children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
