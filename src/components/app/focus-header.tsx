import { LogOut } from "lucide-react";
import { SignOutForm } from "./signout-button";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme";
import { buttonClass } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";

// Kepala halaman fokus (aktivasi, onboarding): logo di kiri; bahasa, tema, dan keluar di kanan, sama di semua halaman
export async function FocusHeader() {
  const { t } = await getI18n();
  return (
    <header className="flex items-center justify-between gap-3">
      <Logo href="/mulai" />
      <div className="flex items-center gap-2">
        <LanguageSwitcher compact className="hidden sm:inline-flex" />
        <ThemeToggle />
        <SignOutForm>
          <button type="submit" className={buttonClass("outline", "md", "gap-2 px-4 hover:border-plum-300 hover:text-plum-700")}>
            <LogOut className="!size-4" aria-hidden="true" />
            <span>{t("Keluar")}</span>
          </button>
        </SignOutForm>
      </div>
    </header>
  );
}
