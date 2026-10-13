"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";

// QR sebagai SVG, dibuat di peramban. Library (uqr) dimuat hanya saat komponen ini tampil.
export function QrImage({ value, label, className }: { value: string; label: string; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import("uqr").then(({ renderSVG }) => { if (alive) setSvg(renderSVG(value, { ecc: "M", border: 1, pixelSize: 6, whiteColor: "#FFFFFF", blackColor: "#1C1619" })); }).catch(() => {});
    return () => { alive = false; };
  }, [value]);
  return (
    <span role="img" aria-label={label} className={cn("block overflow-hidden rounded-lg bg-white p-1 [&_svg]:size-full", className)}>
      {svg ? <span className="block size-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="block size-full animate-pulse rounded bg-neutral-100" />}
    </span>
  );
}
