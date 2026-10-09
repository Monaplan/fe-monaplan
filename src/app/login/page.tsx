import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/app/auth-layout";
import { getSession } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { googleOwnLoginEnabled } from "@/lib/google/oauth";
import { AuthForm } from "./auth-form";
import { pageMetadata } from "@/lib/seo";
import { getI18n, getT } from "@/i18n/server";

export async function generateMetadata() {
  return pageMetadata({
    title: "Masuk atau Daftar",
    description: "Masuk atau buat akun Monaplan dengan email atau Google untuk mulai mengatur checklist, budget, vendor, dan tamu pernikahan kalian.",
    path: "/login",
    tr: await getT(),
  });
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; mode?: string }> }) {
  const { t } = await getI18n();
  const { next, error, mode } = await searchParams;
  if (await getSession()) redirect(next && next.startsWith("/") ? next : "/mulai");
  const signup = mode === "daftar";
  const { trial } = await getSettings();

  return (
    <AuthLayout
      footer={<>{t("Dengan melanjutkan, kamu menyetujui")}{" "}<a className="underline hover:text-plum-700" href="/privasi">{t("Kebijakan Privasi")}</a>{" "}{t("dan Syarat Layanan Monaplan, termasuk pengolahan data sesuai UU No. 27 Tahun 2022.")}</>}
    >
      <AuthForm
        mode={signup ? "daftar" : "masuk"}
        next={next}
        trialDays={trial.enabled ? trial.days : null}
        ownGoogle={googleOwnLoginEnabled()}
        notice={error ? (error === "link" ? "Tautan sudah kedaluwarsa atau pernah dipakai. Silakan coba lagi." : error === "google" ? "Masuk dengan Google gagal. Coba lagi, atau masuk dengan email." : "Gagal masuk. Coba lagi, ya.") : undefined}
      />
    </AuthLayout>
  );
}
