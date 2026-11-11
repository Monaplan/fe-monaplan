"use client";

import { useState } from "react";
import { QrCode, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { CopyButton } from "@/components/ui/copy-button";
import { useToast } from "@/components/ui/toast";
import { QrImage } from "@/components/app/qr-image";
import { useI18n } from "@/i18n/client";

const pill = "inline-flex h-9 items-center gap-1.5 rounded-full border border-[#EDD1DF] bg-white/85 px-3.5 text-[13px] font-semibold text-[#5A2541] shadow-[0_1px_4px_rgba(62,26,45,.06)] backdrop-blur transition-colors hover:bg-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C67C9F] [&_svg]:size-4";

// Tombol QR dan Bagikan di pojok atas halaman bio. Alamat diambil dari halaman yang sedang dibuka, jadi benar di domain mana pun.
// preview: hanya tampilan (pratinjau admin), tidak berfungsi.
export function BioActions({ preview = false }: { preview?: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [qr, setQr] = useState<string | null>(null);
  // Alamat halaman yang sedang dibuka: bio.<domain>/ di domain khusus, atau <situs>/bio di satu domain
  const pageUrl = () => `${window.location.origin}${window.location.pathname}`;

  async function share() {
    const url = pageUrl();
    try {
      if (navigator.share) await navigator.share({ title: "Monaplan", url });
      else { await navigator.clipboard.writeText(url); toast(t("Tautan disalin.")); }
    } catch {
      // Pengguna menutup lembar bagikan: bukan kesalahan
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button type="button" className={pill} onClick={() => !preview && setQr(pageUrl())}><QrCode aria-hidden="true" />{t("QR")}</button>
        <button type="button" className={pill} onClick={() => !preview && share()}><Share2 aria-hidden="true" />{t("Bagikan")}</button>
      </div>
      <Modal open={!!qr} onClose={() => setQr(null)} title={t("Kode QR halaman ini")} description={t("Pindai dengan kamera HP untuk membuka halaman.")}>
        {qr && (
          <div className="flex flex-col items-center gap-4">
            <QrImage value={qr} label={t("Kode QR untuk {url}", { url: qr })} className="size-56 p-2 shadow-card" />
            <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-plum-50 px-4 py-3">
              <code className="tabular min-w-0 flex-1 truncate text-[14px] font-semibold text-plum-800">{qr}</code>
              <CopyButton value={qr} label={t("Salin tautan")} variant="outline" size="md" message={t("Tautan disalin.")}>{t("Salin")}</CopyButton>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
