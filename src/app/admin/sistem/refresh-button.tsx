"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

// Muat ulang angka halaman Sistem tanpa memuat ulang seluruh halaman
export function RefreshButton() {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" icon={<RefreshCw className={pending ? "animate-spin" : undefined} />} disabled={pending} onClick={() => start(() => router.refresh())}>
      {pending ? t("Memuat…") : t("Segarkan")}
    </Button>
  );
}
