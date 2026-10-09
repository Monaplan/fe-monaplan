import { AuthLayout } from "@/components/app/auth-layout";
import { requireUser } from "@/lib/access";
import { ResetForm } from "./reset-form";
import { NOINDEX } from "@/lib/seo";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Buat Password Baru"), robots: NOINDEX };
}

export default async function ResetPasswordPage() {
  const { t } = await getI18n();
  const { user } = await requireUser();
  return (
    <AuthLayout title={t("Buat password baru")} subtitle={t("Untuk akun {email}. Setelah ini kamu bisa masuk dengan email dan password.", { email: user.email })}>
      <ResetForm />
    </AuthLayout>
  );
}
