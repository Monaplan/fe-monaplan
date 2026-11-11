"use client";

import { useRouter } from "next/navigation";
import { AtSign, Building2, Clock, ExternalLink, Mail, Phone } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { StatusPill } from "@/components/ui/pill";
import { saveProfileSettings } from "@/features/admin/config-actions";
import { instagramUrl, whatsappLink, type ContactInfo } from "@/lib/support";
import { useT } from "@/i18n/client";

export function ProfileClient({ saved, effective, fromEnv }: { saved: ContactInfo; effective: ContactInfo; fromEnv: { whatsapp: boolean; email: boolean } }) {
  const t = useT();
  const router = useRouter();
  const test = whatsappLink(effective.whatsapp, "Tes dari Profil Monaplan.");

  const where = [
    { icon: <Phone />, label: t("Nomor WhatsApp"), text: t("Tombol WhatsApp di landing page, halaman Aktivasi, halaman terima kasih, menu bantuan, dan pesan otomatis ke admin.") },
    { icon: <Mail />, label: t("Email bantuan"), text: t("Alamat balasan (reply-to) di semua email dari Monaplan, dan tampil di halaman terima kasih.") },
    { icon: <AtSign />, label: t("Instagram"), text: t("Tampil di halaman terima kasih setelah pembeli checkout.") },
    { icon: <Clock />, label: t("Jam layanan"), text: t("Tampil di dekat tombol WhatsApp di landing page dan halaman terima kasih.") },
  ];

  return (
    <>
      <PageHeader title={t("Profil Monaplan")} description={t("Informasi kontak yang tampil ke pengguna dan pembeli. Perubahan langsung berlaku tanpa deploy ulang.")} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader icon={<Building2 />} title={t("Kontak Monaplan")} subtitle={t("Semua isian boleh dikosongkan. Nomor WhatsApp dan email yang kosong memakai pengaturan lama di .env bila ada.")} />
          <ActionForm action={saveProfileSettings} onSuccess={() => router.refresh()}>
            <Field label={<span className="inline-flex items-center gap-2">{t("Nomor WhatsApp admin")}{fromEnv.whatsapp && <StatusPill tone="neutral">{t("Dari .env")}</StatusPill>}</span>} htmlFor="pf-wa"
              help={t("Boleh ditulis 0812…, +62812…, atau 62812…. Disimpan dalam format internasional.")}>
              <Input id="pf-wa" name="whatsapp" type="tel" inputMode="tel" autoComplete="off" placeholder="0812 3456 7890" defaultValue={saved.whatsapp ? `+${saved.whatsapp}` : ""} maxLength={24} />
            </Field>
            <Field label={<span className="inline-flex items-center gap-2">{t("Email bantuan")}{fromEnv.email && <StatusPill tone="neutral">{t("Dari .env")}</StatusPill>}</span>} htmlFor="pf-email">
              <Input id="pf-email" name="email" type="email" inputMode="email" autoComplete="off" placeholder="halo@domainmu.com" defaultValue={saved.email ?? ""} maxLength={120} />
            </Field>
            <Field label={t("Instagram")} htmlFor="pf-ig" help={t("Tulis namanya saja, tanpa @ atau tautan.")}>
              <Input id="pf-ig" name="instagram" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="monaplan.id" defaultValue={saved.instagram ?? ""} maxLength={60} />
            </Field>
            <Field label={t("Jam layanan")} htmlFor="pf-hours" help={t("Contoh: Senin–Sabtu, 09.00–17.00 WIB. Maksimal 80 karakter.")}>
              <Input id="pf-hours" name="hours" autoComplete="off" placeholder={t("Senin–Sabtu, 09.00–17.00 WIB")} defaultValue={saved.hours ?? ""} maxLength={80} />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton>{t("Simpan")}</SubmitButton>
              {test && (
                <a href={test} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-plum-600 hover:underline">
                  {t("Tes tautan WhatsApp")}<ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
              {effective.instagram && (
                <a href={instagramUrl(effective.instagram)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-plum-600 hover:underline">
                  {t("Buka Instagram")}<ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </ActionForm>
        </Card>

        <Card>
          <CardHeader title={t("Dipakai di mana")} />
          <ul className="space-y-3.5">
            {where.map((x) => (
              <li key={x.label} className="flex items-start gap-3">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-plum-50 text-plum-700 [&_svg]:size-4" aria-hidden="true">{x.icon}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-neutral-800">{x.label}</p>
                  <p className="text-[12.5px] leading-5 text-neutral-600">{x.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
