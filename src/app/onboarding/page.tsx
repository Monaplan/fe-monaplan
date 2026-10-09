import { redirect } from "next/navigation";
import { FocusHeader } from "@/components/app/focus-header";
import { getMyAccess, getMyProjects, isActive, requireUser } from "@/lib/access";
import { OnboardingForm } from "./onboarding-form";
import { NOINDEX } from "@/lib/seo";
import { projectPath } from "@/lib/paths";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mulai"), robots: NOINDEX };
}

export default async function OnboardingPage() {
  const { t } = await getI18n();
  const { profile } = await requireUser();
  if (!isActive(await getMyAccess())) redirect("/aktivasi");
  const own = (await getMyProjects()).filter((p) => p.role === "owner" && !p.archived_at);
  if (own.length) redirect(projectPath(own[0]!));

  return (
    <main className="min-h-dvh bg-plum-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-lg">
        <FocusHeader />
        <h1 className="mt-10 font-display text-[32px] leading-10 font-medium text-neutral-900">{t("Data pernikahan")}</h1>
        <p className="mt-2 text-[13px] text-neutral-600">{t("Bisa diubah nanti di Pengaturan Pernikahan.")}</p>
        <OnboardingForm />
      </div>
    </main>
  );
}
