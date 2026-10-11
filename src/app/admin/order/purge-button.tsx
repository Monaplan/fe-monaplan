"use client";

import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/action-form";
import { purgeUnusedOrders } from "@/features/admin/actions";
import { useI18n } from "@/i18n/client";

export function PurgeButton() {
  const { t } = useI18n();
  return <ActionButton variant="outline" icon={<Trash2 />} action={() => purgeUnusedOrders()} confirmText={t("Bersihkan order tak terpakai dan data lama? Ini tidak bisa dibatalkan.")}>{t("Bersihkan data tak terpakai")}</ActionButton>;
}
