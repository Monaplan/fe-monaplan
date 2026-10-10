import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { LogoMark } from "./logo-mark";

// Nama merek tidak diterjemahkan
export function Logo({ href = "/", className, light }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="Monaplan">
      <LogoMark tone={light ? "light" : "brand"} className="size-9" />
      <span className={cn("font-display text-[22px] font-semibold tracking-tight", light ? "text-white" : "text-neutral-900")}>Monaplan</span>
    </Link>
  );
}
