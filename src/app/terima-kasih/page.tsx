import { ArrowRight, AtSign, CircleCheck, Clock, FileImage, KeyRound, Mail, MessageCircle, UserRound } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { ThemeToggle } from "@/components/app/theme";
import { ButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { NOINDEX } from "@/lib/seo";
import { instagramUrl, whatsappLink } from "@/lib/support";
import { getContact } from "@/lib/settings";
import { getI18n, getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Terima kasih"), robots: NOINDEX };
}

// Halaman setelah checkout di toko (Lynk.id): tujuan pengalihan setelah bayar. Publik, pembeli belum tentu punya akun.
export default async function ThankYouPage() {
  const { t } = await getI18n();
  const contact = await getContact();
  const wa = whatsappLink(contact.whatsapp, "Halo admin Monaplan, saya sudah checkout di Lynk.id dan mau minta kode akses.\n\nNama pemesan: \nEmail untuk akun Monaplan: \n\nBukti pembayaran saya lampirkan di chat ini.");

  const send = [
    { icon: <UserRound />, text: t("Nama pemesan, sama seperti yang kamu isi saat checkout") },
    { icon: <Mail />, text: t("Email yang akan kamu pakai untuk akun Monaplan") },
    { icon: <FileImage />, text: t("Tangkapan layar atau bukti pembayaran") },
  ];
  const steps = [
    { title: t("Hubungi admin lewat WhatsApp"), text: t("Kirim data di atas supaya pembayaranmu bisa kami cocokkan.") },
    { title: t("Terima kode akses"), text: t("Admin mengirim kode (MNP-XXXX-XXXX-XXXX) lewat WhatsApp setelah pembayaranmu dicek.") },
    { title: t("Aktifkan di Monaplan"), text: t("Daftar atau masuk, lalu masukkan kodenya di halaman aktivasi. Akunmu langsung aktif.") },
  ];

  return (
    <main className="min-h-dvh bg-plum-50 px-4 pt-5 pb-12 sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-3">
          <Logo href="/" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact className="hidden sm:inline-flex" />
            <ThemeToggle />
          </div>
        </header>

        <article className="reveal mx-auto mt-10 max-w-2xl overflow-hidden rounded-3xl border border-neutral-200/80 bg-surface shadow-modal sm:mt-14">
          <div className="brand-canvas relative overflow-hidden px-5 py-8 text-center text-white sm:px-10 sm:py-9">
            <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-14 size-56 rounded-full border border-white/10" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-10 size-40 rounded-full border border-white/10" />
            <span className="relative mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-white/15"><CircleCheck className="size-7 text-[#EDD1DF]" aria-hidden="true" /></span>
            <h1 className="relative mt-4 font-display text-[30px] leading-9 font-medium sm:text-[40px] sm:leading-[46px]">{t("Terima kasih, pesananmu sudah kami terima")}</h1>
            <p className="relative mx-auto mt-3 max-w-md text-[14.5px] leading-6 text-white/80">{t("Satu langkah lagi: hubungi admin lewat WhatsApp agar kode aksesmu segera kami kirim.")}</p>
          </div>

          <div className="p-5 sm:p-10">
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-glow inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#1FA855] px-5 py-3 text-center text-[16px] leading-5 font-semibold text-white shadow-btn transition-colors hover:bg-[#188a45] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#1FA855]">
                <WhatsAppIcon className="size-5" />{t("Hubungi admin via WhatsApp")}
              </a>
            ) : (
              <p className="flex items-start gap-2.5 rounded-2xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution"><MessageCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{t("Nomor WhatsApp admin belum diatur. Hubungi kami lewat halaman bantuan.")}</p>
            )}
            <p className="mt-3 text-center text-[12.5px] text-neutral-500">{t("Pesan sudah terisi otomatis, kamu tinggal melengkapi nama dan email.")}</p>
            {contact.hours && (
              <p className="mt-1.5 flex items-center justify-center gap-1.5 text-center text-[12.5px] font-medium text-neutral-600"><Clock className="size-3.5 shrink-0 text-plum-600" aria-hidden="true" />{t("Jam layanan: {hours}", { hours: contact.hours })}</p>
            )}

            <section aria-labelledby="ty-send" className="mt-8">
              <h2 id="ty-send" className="text-[11px] font-semibold tracking-[0.14em] text-plum-600 uppercase sm:tracking-[0.18em]">{t("Yang perlu kamu kirim ke admin")}</h2>
              <ul className="mt-3 space-y-2.5">
                {send.map((x) => (
                  <li key={x.text} className="flex items-center gap-3 rounded-xl bg-plum-50 px-3.5 py-3 text-[14px] text-neutral-800">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-plum-700 [&_svg]:size-4" aria-hidden="true">{x.icon}</span>{x.text}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="ty-steps" className="mt-8">
              <h2 id="ty-steps" className="text-[11px] font-semibold tracking-[0.14em] text-plum-600 uppercase sm:tracking-[0.18em]">{t("Langkah selanjutnya")}</h2>
              <ol className="mt-3 space-y-4">
                {steps.map((s, i) => (
                  <li key={s.title} className="flex items-start gap-3.5">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-plum-600 text-[13px] font-bold text-white">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-neutral-900">{s.title}</p>
                      <p className="mt-0.5 text-[13.5px] leading-5 text-neutral-600">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {(contact.email || contact.instagram) && (
              <p className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-neutral-600">
                {contact.email && <a href={`mailto:${contact.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-plum-700"><Mail className="size-4 shrink-0 text-plum-600" aria-hidden="true" /><span className="truncate">{contact.email}</span></a>}
                {contact.instagram && <a href={instagramUrl(contact.instagram)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-plum-700"><AtSign className="size-4 shrink-0 text-plum-600" aria-hidden="true" />{contact.instagram}</a>}
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3 border-t border-neutral-200/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-[12.5px] leading-5 text-neutral-500"><KeyRound className="mt-0.5 size-3.5 shrink-0 text-plum-600" aria-hidden="true" />{t("Sudah punya kode akses? Langsung aktifkan sekarang.")}</p>
              <ButtonLink href="/aktivasi" variant="outline" className="shrink-0">{t("Buka halaman aktivasi")}<ArrowRight className="ml-0.5" aria-hidden="true" /></ButtonLink>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
