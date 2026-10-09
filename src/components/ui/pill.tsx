import { Circle, CircleAlert, CircleCheck, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export type Tone = "positive" | "caution" | "danger" | "neutral";

const TONE: Record<Tone, string> = {
  positive: "bg-positive-bg text-positive",
  caution: "bg-caution-bg text-caution",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-neutral-100 text-neutral-600",
};
const ICON: Record<Tone, ReactNode> = {
  positive: <CircleCheck />,
  caution: <Clock />,
  danger: <CircleAlert />,
  neutral: <Circle />,
};

export function StatusPill({ tone = "neutral", children, icon, className }: { tone?: Tone; children: ReactNode; icon?: ReactNode | false; className?: string }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-xs leading-4 font-medium whitespace-nowrap [&_svg]:size-3", TONE[tone], className)}>
      {icon === false ? null : (icon ?? ICON[tone])}
      {children}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "danger" }) {
  return (
    <span className={cn("tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold", tone === "danger" ? "bg-danger-bg text-danger" : "bg-neutral-100 text-neutral-600")}>
      {children}
    </span>
  );
}
