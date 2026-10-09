"use client";

import { useState } from "react";
import { Ban, Copy } from "lucide-react";
import { ActionButton } from "@/components/ui/action-form";
import { Input } from "@/components/ui/form";
import { StatusPill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { formatDateCompact } from "@/lib/format";
import { revokeBatch, revokeCode } from "@/features/admin/actions";
import { useI18n } from "@/i18n/client";
import { useT } from "@/i18n/client";

type Code = {
  id: string; code: string; status: string; redemption_count: number; max_redemptions: number; valid_until: string | null; revoked_reason: string | null;
  access_code_redemptions: { redeemed_at: string; license_id: string; profiles: { email: string } | null }[];
};

export function BatchCodes({ codes }: { codes: Code[] }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [q, setQ] = useState("");
  const list = codes.filter((c) => !q || c.code.includes(q.toUpperCase()) || c.access_code_redemptions.some((r) => r.profiles?.email.includes(q.toLowerCase())));
  return (
    <>
      <div className="border-b border-neutral-200 p-3"><Input placeholder={t("Cari kode atau email penebus")} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" /></div>
      {list.slice(0, 500).map((c) => {
        const expired = c.valid_until && Date.parse(c.valid_until) < Date.now();
        return (
          <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-neutral-200 px-5 py-2.5 last:border-0">
            <code className="tabular text-sm font-semibold tracking-wider">{c.code}</code>
            <button aria-label={t("Salin kode")} className="text-neutral-400 hover:text-plum-600" onClick={() => { navigator.clipboard.writeText(c.code); toast(t("Kode disalin.")); }}><Copy className="size-4" /></button>
            <span className="min-w-0 flex-1 truncate text-xs text-neutral-500">
              {c.access_code_redemptions.map((r) => `${r.profiles?.email ?? "?"} (${formatDateCompact(r.redeemed_at, undefined, lang)})`).join(", ")}
            </span>
            <span className="tabular text-xs text-neutral-500">{c.redemption_count}/{c.max_redemptions}</span>
            {c.status === "revoked" ? <StatusPill tone="danger">{t("Dicabut")}</StatusPill>
              : c.status === "redeemed" ? <StatusPill tone="positive">{t("Tertebus")}</StatusPill>
              : expired ? <StatusPill>{t("Kedaluwarsa")}</StatusPill>
              : <StatusPill tone="caution">{t("Tersedia")}</StatusPill>}
            {c.status === "available" && (
              <ActionButton size="icon-sm" variant="ghost" title={t("Cabut kode")} icon={<Ban />} confirmText={t("Cabut kode {code}?", { code: c.code })} action={() => revokeCode(c.id, "Dicabut admin")} />
            )}
          </div>
        );
      })}
      {list.length > 500 && <p className="px-5 py-3 text-xs text-neutral-500">{t("Menampilkan 500 dari {length} kode. Gunakan ekspor CSV untuk daftar lengkap.", { length: list.length })}</p>}
    </>
  );
}

export function RevokeBatchButton({ batchId }: { batchId: string }) {
  const t = useT();
  return <ActionButton variant="danger" size="md" icon={<Ban />} confirmText={t("Cabut semua kode yang belum terpakai di batch ini?")} action={() => revokeBatch(batchId)}>{t("Cabut Batch")}</ActionButton>;
}
