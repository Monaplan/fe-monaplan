import Link from "next/link";
import { cn } from "@/components/ui/cn";

export function Logo({ href = "/", className, light }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="Monaplan">
      <span className={cn("inline-flex size-8 items-center justify-center rounded-full font-display text-lg font-semibold italic", light ? "bg-[#FFFFFF] text-[#3E1A2D]" : "bg-plum-600 text-white")}>
        M
      </span>
      <span className={cn("font-display text-[22px] font-semibold tracking-tight", light ? "text-white" : "text-neutral-900")}>Monaplan</span>
    </Link>
  );
}
