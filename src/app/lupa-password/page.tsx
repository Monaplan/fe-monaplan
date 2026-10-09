import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/components/app/auth-layout";
import { ForgotForm } from "./forgot-form";
import { NOINDEX } from "@/lib/seo";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Lupa Password"), robots: NOINDEX };
}

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();
  return (
    <AuthLayout title={t("Lupa password?")} subtitle={t("Masukkan email akunmu. Kami kirim tautan untuk membuat password baru.")}>
      <ForgotForm />
      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-600 hover:text-plum-700">
        <ArrowLeft className="size-4" />{t("Kembali ke halaman masuk")}</Link>
    </AuthLayout>
  );
}
