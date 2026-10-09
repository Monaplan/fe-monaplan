import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/components/app/auth-layout";
import { ForgotForm } from "./forgot-form";
import { NOINDEX } from "@/lib/seo";

export const metadata = { title: "Lupa Password", robots: NOINDEX };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Lupa password?" subtitle="Masukkan email akunmu. Kami kirimkan tautan untuk membuat password baru.">
      <ForgotForm />
      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-600 hover:text-plum-700">
        <ArrowLeft className="size-4" />Kembali ke halaman masuk
      </Link>
    </AuthLayout>
  );
}
