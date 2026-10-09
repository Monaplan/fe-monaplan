import { Logo } from "@/components/app/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-plum-50 px-4">
      <div className="text-center">
        <Logo className="mb-8" />
        <p className="font-display text-[64px] leading-none font-medium text-plum-300">404</p>
        <h1 className="mt-3 text-xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-[13px] text-neutral-600">Halaman ini tidak ada atau kamu tidak punya akses ke ruang kerja ini.</p>
        <ButtonLink href="/mulai" className="mt-6">Kembali ke Dashboard</ButtonLink>
      </div>
    </main>
  );
}
