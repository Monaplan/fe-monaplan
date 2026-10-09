import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarHeart, Users, Wallet } from "lucide-react";
import { ThemeToggle } from "./theme";
import { LanguageSwitcher } from "./language-switcher";
import { AuthHeading } from "./auth-heading";
import { getI18n } from "@/i18n/server";

// Tata letak halaman masuk, daftar, dan reset password
export async function AuthLayout({ title, subtitle, children, footer }: { title?: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = await getI18n();
  return (
    <main className="grid min-h-dvh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      {/* Panel kiri menempel setinggi layar: tidak ikut bergeser walau formulir di kanan lebih panjang (Masuk vs Daftar) */}
      <aside className="brand-canvas relative hidden overflow-hidden p-12 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:self-start">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10 font-display text-2xl font-semibold italic ring-1 ring-white/20">{t("M")}</span>
          <span className="font-display text-2xl font-semibold">{t("Monaplan")}</span>
        </Link>
        <div className="mt-auto max-w-md">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#EDD1DF] uppercase">{t("Digital Wedding Planner")}</p>
          <h2 className="mt-3 font-display text-[44px] leading-[1.1] font-medium">{t("Atur pernikahan di satu tempat.")}</h2>
          <ul className="mt-8 space-y-3 text-[14px] text-white/85">
            {[
              [<CalendarHeart key="a" />, "Checklist per fase dengan hitung mundur hari H"],
              [<Wallet key="b" />, "Budget, vendor, dan jadwal pelunasan"],
              [<Users key="c" />, "RSVP tamu lewat WhatsApp, rekap otomatis"],
            ].map(([icon, text], i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 [&_svg]:size-4">{icon}</span>
                {t(text as string)}
              </li>
            ))}
          </ul>
        </div>
        <span className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full border border-white/10" />
        <span className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full border border-white/10" />
      </aside>

      <section className="relative flex flex-col px-5 py-8 sm:px-10">
        <div className="absolute top-5 right-5 flex items-center gap-1.5">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
        <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#A9557E] to-[#5A2541] font-display text-xl font-semibold text-white italic">{t("M")}</span>
          <span className="font-display text-[22px] leading-7 font-semibold">{t("Monaplan")}</span>
        </Link>
        <div className="mx-auto w-full max-w-[400px] lg:mt-[clamp(0px,9dvh,96px)]">
          {title && <AuthHeading title={title} subtitle={subtitle} />}
          <div className={title ? "mt-8" : undefined}>{children}</div>
        </div>
        {footer && <div className="mx-auto mt-10 w-full max-w-[400px] text-center text-xs leading-5 text-neutral-500">{footer}</div>}
      </section>
    </main>
  );
}
