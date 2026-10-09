"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function PrintButton() {
  const t = useT();
  return <Button variant="outline" size="sm" icon={<Printer />} className="no-print" onClick={() => window.print()}>{t("Cetak")}</Button>;
}
