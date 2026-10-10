"use client";

import { HardDrive, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/action-form";
import { deleteOrphanFiles, scanOrphanFiles } from "@/features/admin/actions";
import { useI18n } from "@/i18n/client";

export function OrphanFiles() {
  const { t } = useI18n();
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 px-5 py-4">
      <p className="min-w-0 flex-1 text-[13px] text-neutral-600">{t("Berkas unggahan yang tidak jadi disimpan tetap memakan ruang R2. Periksa dulu, lalu hapus bila angkanya masuk akal.")}</p>
      <ActionButton variant="outline" icon={<HardDrive />} action={() => scanOrphanFiles()}>{t("Periksa berkas yatim")}</ActionButton>
      <ActionButton variant="outline" icon={<Trash2 />} action={() => deleteOrphanFiles()} confirmText={t("Hapus semua berkas yang tidak dirujuk database dan berumur lebih dari 24 jam? Ini tidak bisa dibatalkan.")}>{t("Hapus berkas yatim")}</ActionButton>
    </div>
  );
}
