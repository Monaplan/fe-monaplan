"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ExternalLink } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { StatusPill } from "@/components/ui/pill";
import { savePaymentSettings } from "@/features/admin/config-actions";
import { useT } from "@/i18n/client";

export function PaymentClient({ enabled: saved, storeUrl }: { enabled: boolean; storeUrl: string | null }) {
  const t = useT();
  const router = useRouter();
  const [enabled, setEnabled] = useState(saved);
  useEffect(() => setEnabled(saved), [saved]);

  return (
    <>
      <PageHeader title={t("Pembayaran")} description={t("Pilih cara penjualan: bayar langsung di website, atau lewat toko dengan kode akses.")} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader icon={<CreditCard />} title={t("Pembayaran di website")} subtitle={t("Saat dimatikan, checkout Midtrans ditutup dan pembeli diarahkan ke toko.")}
            action={<Switch label={t("Aktifkan pembayaran di website")} checked={enabled} onChange={setEnabled} />} />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusPill tone={saved ? "positive" : "caution"}>{saved ? t("Midtrans aktif") : t("Lewat toko")}</StatusPill>
            {enabled !== saved && <span className="text-[13px] text-neutral-600">{t("Perubahan belum disimpan.")}</span>}
          </div>
          <ActionForm action={savePaymentSettings} onSuccess={() => router.refresh()}>
            {enabled && <input type="hidden" name="enabled" value="on" />}
            <Field label={t("Tautan halaman toko (mis. Lynk.id)")} htmlFor="pay-store" help={t("Tujuan tombol Aktivasi Sekarang di landing page. Boleh dikosongkan: tombol akan membuka halaman Aktivasi.")}>
              <Input id="pay-store" name="store_url" type="url" inputMode="url" placeholder="https://" defaultValue={storeUrl ?? ""} maxLength={500} />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton>{t("Simpan")}</SubmitButton>
              {storeUrl && (
                <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-plum-600 hover:underline">
                  {t("Buka halaman toko")}<ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </ActionForm>
        </Card>

        <Card>
          <CardHeader title={t("Saat dimatikan")} />
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-5 text-neutral-600">
            <li>{t("Tombol di landing page berubah menjadi Aktivasi Sekarang dan membuka halaman toko.")}</li>
            <li>{t("Halaman Aktivasi hanya menampilkan kolom kode akses. Kode dibuat di menu Kode Akses dan dikirim ke pembeli setelah bayar di toko.")}</li>
            <li>{t("Kode promo di website tidak bisa dipakai. Diskon yang benar-benar berlaku diatur di toko. Promo di menu Promo hanya menjadi tampilan di landing page, jadi samakan nilainya.")}</li>
            <li>{t("Pesanan Midtrans yang sudah berjalan tetap diproses. Penjualan lewat toko tidak muncul di menu Order.")}</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
