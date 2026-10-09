import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/app/auth-layout";
import { getSession } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { AuthForm } from "./auth-form";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Masuk atau Daftar",
  description: "Masuk atau buat akun Monaplan dengan email atau Google untuk mulai mengatur checklist, budget, vendor, dan tamu pernikahan kalian.",
  path: "/login",
});

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; mode?: string }> }) {
  const { next, error, mode } = await searchParams;
  if (await getSession()) redirect(next && next.startsWith("/") ? next : "/mulai");
  const signup = mode === "daftar";
  const { trial } = await getSettings();

  return (
    <AuthLayout
      footer={<>Dengan melanjutkan, kamu menyetujui <a className="underline hover:text-plum-700" href="/privasi">Kebijakan Privasi</a> dan Syarat Layanan Monaplan, termasuk pengolahan data sesuai UU No. 27 Tahun 2022.</>}
    >
      <AuthForm
        mode={signup ? "daftar" : "masuk"}
        next={next}
        trialDays={trial.enabled ? trial.days : null}
        notice={error ? (error === "link" ? "Tautan sudah kedaluwarsa atau pernah dipakai. Silakan coba lagi." : "Gagal masuk. Coba lagi, ya.") : undefined}
      />
    </AuthLayout>
  );
}
