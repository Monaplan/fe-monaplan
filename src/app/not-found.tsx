import { Logo } from "@/components/app/logo";
import { ButtonLink } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-plum-50 px-4">
      <div className="text-center">
        <Logo className="mb-8" />
        <p className="font-display text-[64px] leading-none font-medium text-plum-300">404</p>
        <h1 className="mt-3 text-xl font-semibold">{t("Halaman tidak ditemukan")}</h1>
        <p className="mt-2 text-[13px] text-neutral-600">{t("Halaman ini tidak ada atau kamu tidak punya akses ke ruang kerja ini.")}</p>
        <ButtonLink href="/mulai" className="mt-6">{t("Kembali ke Dashboard")}</ButtonLink>
      </div>
    </main>
  );
}
