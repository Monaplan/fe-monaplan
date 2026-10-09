import { redirect } from "next/navigation";
import Link from "next/link";
import { FocusHeader } from "@/components/app/focus-header";
import { daysLeft, getMyAccess, requireUser } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { formatDateCompact } from "@/lib/format";
import { priceFor } from "@/lib/pricing";
import { getPricingContext } from "@/lib/settings";
import { ActivationClient } from "./activation-client";
import { NOINDEX } from "@/lib/seo";

export const metadata = { title: "Aktivasi", robots: NOINDEX };

export default async function ActivationPage() {
  await requireUser();
  const access = await getMyAccess();
  if (access.state === "lifetime") redirect("/akun");

  const supabase = await createClient();
  const [{ data: plans }, { promoEnabled, promos }] = await Promise.all([
    supabase.from("plans").select("*").eq("type", "lifetime").order("sort_order"),
    getPricingContext(),
  ]);
  const pricing = Object.fromEntries(
    (plans ?? []).map((p) => {
      const x = priceFor(p, promos, promoEnabled);
      return [p.id, { original: x.original, final: x.final, promoName: x.promo?.name ?? null, promoEndsAt: x.promo?.ends_at ?? null }];
    }),
  );

  const trialLeft = access.state === "timed" && access.isTrial ? daysLeft(access.endsAt) : null;
  let title = "Satu langkah lagi menuju persiapan yang tenang.";
  let subtitle = "Pilih paket atau masukkan kode akses untuk mulai.";
  if (access.state === "timed" && access.isTrial) {
    title = "Suka dengan Monaplan? Simpan aksesnya selamanya.";
    subtitle = `Masa trial kamu tersisa ${trialLeft} hari (sampai ${formatDateCompact(access.endsAt)}). Bayar sekali, data dan akses tetap bersamamu.`;
  } else if (access.state === "expired" && access.isTrial) {
    title = "Masa trial kamu sudah berakhir.";
    subtitle = "Data tetap aman dan bisa dilihat. Dapatkan akses selamanya untuk kembali mengedit.";
  } else if (access.state === "timed") {
    title = "Upgrade ke akses selamanya";
    subtitle = `Akses kamu saat ini aktif sampai ${formatDateCompact(access.endsAt)}.`;
  } else if (access.state === "expired") {
    subtitle = "Masa aktif kamu sudah berakhir. Data tetap aman, aktifkan lagi untuk kembali mengedit.";
  }

  return (
    <main className="min-h-dvh bg-plum-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <FocusHeader />

        <h1 className="mt-10 text-center font-display text-[32px] leading-10 font-medium text-neutral-900 sm:text-[36px] sm:leading-[44px]">{title}</h1>
        <p className="mt-2 text-center text-[13px] text-neutral-600">{subtitle}</p>

        <ActivationClient
          plans={plans ?? []}
          pricing={pricing}
          hasAccess={access.state === "timed"}
          clientKey={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? ""}
          isProduction={process.env.MIDTRANS_IS_PRODUCTION === "true"}
        />

        <p className="mt-10 text-center text-xs text-neutral-500">
          Butuh bantuan? <Link href="mailto:halo@monaplan.id" className="underline">Hubungi kami</Link> · <Link href="/privasi" className="underline">Kebijakan privasi</Link>
        </p>
      </div>
    </main>
  );
}
