import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { getI18n } from "@/i18n/server";

// Kepala halaman fokus (aktivasi, onboarding): logo di kiri, keluar di kanan, sama di semua halaman
export async function FocusHeader() {
  const { t } = await getI18n();
  return (
    <div className="flex items-center justify-between">
      <Logo href="/mulai" />
      <div className="flex items-center gap-3">
        <LanguageSwitcher compact />
      <form action="/auth/signout" method="post">
        <button className="text-[13px] text-neutral-600 hover:text-plum-700">{t("Keluar")}</button>
      </form>
      </div>
    </div>
  );
}
