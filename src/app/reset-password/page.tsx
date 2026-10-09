import { AuthLayout } from "@/components/app/auth-layout";
import { requireUser } from "@/lib/access";
import { ResetForm } from "./reset-form";
import { NOINDEX } from "@/lib/seo";

export const metadata = { title: "Buat Password Baru", robots: NOINDEX };

export default async function ResetPasswordPage() {
  const { user } = await requireUser();
  return (
    <AuthLayout title="Buat password baru" subtitle={`Untuk akun ${user.email}. Setelah ini kamu bisa masuk dengan email dan password.`}>
      <ResetForm />
    </AuthLayout>
  );
}
