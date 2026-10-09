import type { ReactNode } from "react";
import { cn } from "./cn";
import { IconTile } from "./card";
import { formatPercent } from "@/lib/format";

export function ProgressBar({ value, tone, className }: { value: number; tone?: "default" | "danger" | "caution" | "white"; className?: string }) {
  const v = Math.max(0, Math.min(1, value));
  const t = tone ?? (value > 1 ? "danger" : "default");
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full", t === "white" ? "bg-white/20" : "bg-plum-100", className)}
      role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("animate-grow h-full rounded-full transition-[width] duration-500",
        t === "danger" ? "bg-danger" : t === "caution" ? "bg-[#D08A6C]" : t === "white" ? "bg-[#FFFFFF]" : "bg-plum-600")}
        style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function ProgressRow({ icon, title, done, total }: { icon: ReactNode; title: string; done: number; total: number }) {
  const ratio = total > 0 ? done / total : 0;
  return (
    <div className="flex items-center gap-3">
      <IconTile>{icon}</IconTile>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-neutral-800">{title}</span>
          <span className="tabular text-[13px] text-neutral-500">
            {done}/{total} <span className="ml-1 font-semibold text-neutral-800">{formatPercent(ratio)}</span>
          </span>
        </div>
        <ProgressBar value={ratio} />
      </div>
    </div>
  );
}
