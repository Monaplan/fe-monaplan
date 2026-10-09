import { redirect } from "next/navigation";
import { FocusHeader } from "@/components/app/focus-header";
import { getMyAccess, getMyProjects, isActive, requireUser } from "@/lib/access";
import { OnboardingForm } from "./onboarding-form";
import { NOINDEX } from "@/lib/seo";

export const metadata = { title: "Mulai", robots: NOINDEX };

export default async function OnboardingPage() {
  const { profile } = await requireUser();
  if (!isActive(await getMyAccess())) redirect("/aktivasi");
  const own = (await getMyProjects()).filter((p) => p.role === "owner" && !p.archived_at);
  if (own.length) redirect(`/w/${own[0]!.id}`);

  return (
    <main className="min-h-dvh bg-plum-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-lg">
        <FocusHeader />
        <h1 className="mt-10 font-display text-[32px] leading-10 font-medium text-neutral-900">
          Halo{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}! Ceritakan tentang pernikahan kalian.
        </h1>
        <p className="mt-2 text-[13px] text-neutral-600">Tiga langkah singkat. Semuanya bisa diubah nanti di Pengaturan Pernikahan.</p>
        <OnboardingForm />
      </div>
    </main>
  );
}
