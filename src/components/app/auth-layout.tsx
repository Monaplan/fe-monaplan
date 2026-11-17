import { LogoMark } from "./logo-mark";
import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "./theme";
import { LanguageSwitcher } from "./language-switcher";
import { AuthHeading } from "./auth-heading";
import { AuthIllustration } from "./auth-illustration";
import { getI18n } from "@/i18n/server";

// Tata letak halaman masuk, daftar, dan reset password: satu kartu besar bernuansa hangat. Kiri berisi sapaan dan
// ilustrasi meja perencanaan bersama maskot Mona; kanan berisi formulir dalam kartu putih yang melayang.
// Di layar kecil hanya kartu formulir yang tampil.
export async function AuthLayout({ title, subtitle, children, footer }: { title?: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = await getI18n();
  return (
    <main className="relative flex min-h-dvh flex-col bg-[#F1E9EE] dark:bg-canvas">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 sm:top-5 sm:right-5">
        <LanguageSwitcher compact />
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-3 pt-16 pb-6 sm:px-6 lg:p-8">
        <div className="grid w-full max-w-[1180px] overflow-hidden rounded-[32px] bg-[#FBEFF3] shadow-[0_40px_90px_-50px_rgba(90,37,65,0.45)] ring-1 ring-[#5A2541]/5 lg:min-h-[min(760px,calc(100dvh-4rem))] lg:grid-cols-[1.12fr_1fr] dark:bg-plum-50 dark:ring-white/5">
          <aside className="relative hidden flex-col lg:flex">
            <Link href="/" className="mx-12 mt-10 flex w-fit items-center gap-2.5">
              <LogoMark className="size-10" gradientId="mp-mark-g-auth" />
              <span className="font-display text-[26px] leading-none font-semibold text-[#3E1A2D] dark:text-neutral-900">{t("Monaplan")}</span>
            </Link>
            <div className="mx-12 mt-12 max-w-md">
              <h2 className="font-display text-[44px] leading-[1.08] font-medium text-[#3E1A2D] dark:text-neutral-900">{t("Halo, calon pengantin!")}</h2>
              <p className="mt-4 max-w-sm text-[16px] leading-7 text-[#6B5560] dark:text-neutral-600">{t("Masuk untuk melanjutkan persiapan hari bahagiamu, selangkah demi selangkah.")}</p>
            </div>
            <AuthIllustration className="mt-auto block w-full" />
          </aside>

          <section className="flex flex-col p-2.5 sm:p-4 lg:py-6 lg:pr-6 lg:pl-0">
            <div className="flex flex-1 flex-col rounded-[26px] bg-surface px-5 py-8 shadow-[0_24px_60px_-34px_rgba(90,37,65,0.4)] ring-1 ring-[#5A2541]/6 sm:px-10 sm:py-10 dark:ring-white/6">
              <Link href="/" className="mx-auto mb-8 flex items-center gap-2 lg:hidden">
                <LogoMark className="size-9" />
                <span className="font-display text-[22px] leading-7 font-semibold">{t("Monaplan")}</span>
              </Link>
              <div className="mx-auto my-auto w-full max-w-[400px]">
                {title && <AuthHeading title={title} subtitle={subtitle} />}
                <div className={title ? "mt-8" : undefined}>{children}</div>
              </div>
              {footer && <div className="mx-auto mt-8 w-full max-w-[400px] text-center text-xs leading-5 text-neutral-500">{footer}</div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
