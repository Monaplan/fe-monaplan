"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Link2, RefreshCw } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ActionButton } from "@/components/ui/action-form";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { useToast } from "@/components/ui/toast";
import { waLink } from "@/lib/format";
import { useT } from "@/i18n/client";
import { disableStaffLink, rotateStaffLink, setStaffCanRecordGifts } from "./staff-actions";

// Pengaturan > Kolaborator: tautan panitia (DESIGN.md 20.6). Hanya dirender untuk pemilik.
export function StaffLinkCard({ projectId, coupleName, token, canRecordGifts }: { projectId: string; coupleName: string; token: string | null; canRecordGifts: boolean }) {
  const t = useT();
  const toast = useToast();
  const [origin, setOrigin] = useState("");
  const [gifts, setGifts] = useState(canRecordGifts);
  const [pending, start] = useTransition();
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => setGifts(canRecordGifts), [canRecordGifts]);
  const url = token ? `${origin}/panitia/${token}` : "";

  return (
    <Card tour="settings-staff">
      <CardHeader icon={<Link2 />} title={t("Tautan Panitia")} subtitle={t("Untuk keluarga atau penerima tamu tanpa akun: rundown, kontak vendor, dan check-in tamu di hari H.")} />
      {!token ? (
        <ActionButton variant="primary" size="md" icon={<Link2 />} action={() => rotateStaffLink(projectId)}>{t("Buat Tautan Panitia")}</ActionButton>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input readOnly value={url} aria-label={t("Tautan panitia")} className="h-10 text-xs" onFocus={(e) => e.target.select()} />
            <Button variant="secondary" icon={<Copy />} onClick={() => { navigator.clipboard.writeText(url); toast(t("Link disalin.")); }}>{t("Salin")}</Button>
          </div>
          <a href={waLink(null, t("Halo, ini tautan panitia untuk hari H {couple}. Isinya rundown, kontak vendor, dan check-in tamu. Mohon tidak dibagikan ke orang lain: {url}", { couple: coupleName, url }))}
            target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-800 hover:bg-plum-50">
            <WhatsAppIcon className="size-4" />{t("Kirim lewat WhatsApp")}
          </a>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] text-neutral-700"><b className="block font-semibold text-neutral-900">{t("Panitia boleh mencatat amplop")}</b>{t("Catatan masuk ke Amplop & Kado dengan tanda Dicatat panitia.")}</span>
            <Switch checked={gifts} disabled={pending} label={t("Panitia boleh mencatat amplop")}
              onChange={(v) => { setGifts(v); start(async () => { const r = await setStaffCanRecordGifts(projectId, v); if (!r.ok) { setGifts(!v); toast(r.error, "danger"); } }); }} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-4">
            <ActionButton variant="ghost" icon={<RefreshCw />} confirmText={t("Buat ulang tautan? Tautan lama langsung berhenti bekerja.")} action={() => rotateStaffLink(projectId)}>{t("Buat ulang")}</ActionButton>
            <ActionButton variant="danger" confirmText={t("Matikan tautan panitia?")} action={() => disableStaffLink(projectId)}>{t("Matikan")}</ActionButton>
          </div>
          <p className="text-[12px] leading-5 text-neutral-500">{t("Siapa pun yang memegang tautan ini bisa melihat rundown dan nomor vendor. Buat ulang bila tautan tersebar ke orang yang tidak semestinya.")}</p>
        </div>
      )}
    </Card>
  );
}
