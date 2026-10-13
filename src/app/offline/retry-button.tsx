"use client";

import { RefreshCw } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export function RetryButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} className={buttonClass("primary", "lg")}>
      <RefreshCw className="size-4" />Coba lagi
    </button>
  );
}
