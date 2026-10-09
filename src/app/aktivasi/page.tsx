import { redirect } from "next/navigation";
import Link from "next/link";
import { FocusHeader } from "@/components/app/focus-header";
import { daysLeft, getMyAccess, requireUser } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedLifetime } from "@/lib/upgrade";
import { createClient } from "@/lib/supabase/server";
import { formatDateCompact } from "@/lib/format";
import { upgradeQuote } from "@/lib/pricing";
import { getPricingContext } from "@/lib/settings";
import { ActivationClient } from "./activation-client";
import { NOINDEX } from "@/lib/seo";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Aktivasi"), robots: NOINDEX };
}

export default async function ActivationPage() {
  const { t, lang } = await getI18n();
  const { user } = await requireUser();
  const access = await getMyAccess();

  const supabase = await createClient();
  const [{ data: allPlans }, { promoEnabled, promos }, owned] = await Promise.all([
    supabase.from("plans").select("*").eq("type", "lifetime").order("tier").order("sort_order"),
    getPricingContext(),
    getOwnedLifetime(createAdminClient(), user.id),
  ]);
  // Pemilik akses selamanya hanya melihat paket yang lebih tinggi, dengan harga selisih
  const quotes = new Map((allPlans ?? []).map((p) => [p.id, upgradeQuote({ id: p.id, price_idr: p.price_idr, tier: Number(p.tier ?? 1) }, owned, promos, promoEnabled)]));
  const plans = (allPlans ?? []).filter((p) => quotes.get(p.id));
  if (owned && !plans.length) redirect("/akun");
  const pricing = Object.fromEntries(
    plans.map((p) => {
      const q = quotes.get(p.id)!;
      return [p.id, { original: q.original, final: q.payable, credit: q.credit, promoName: q.promo?.name ?? null, promoEndsAt: q.promo?.ends_at ?? null }];
    }),
  );

  const trialLeft = access.state === "timed" && access.isTrial ? daysLeft(access.endsAt) : null;
  let title = t("Pilih paket");
  let subtitle = t("Bayar sekali untuk akses selamanya, atau masukkan kode akses.");
  if (owned) {
    title = t("Upgrade paket");
    subtitle = owned.creditIdr > 0 ? t("Paket sekarang: {plan}. Kamu hanya membayar selisihnya.", { plan: owned.planName }) : t("Paket sekarang: {plan}.", { plan: owned.planName });
  }
  if (owned) {
    // sudah diatur di atas
  } else if (access.state === "timed" && access.isTrial) {
    title = t("Lanjutkan setelah trial");
    subtitle = t("Trial tersisa {n} hari (sampai {date}).", { n: trialLeft, date: formatDateCompact(access.endsAt, undefined, lang) });
  } else if (access.state === "expired" && access.isTrial) {
    title = t("Trial berakhir");
    subtitle = t("Data tetap aman dan bisa dilihat. Aktifkan akses untuk mengedit lagi.");
  } else if (access.state === "timed") {
    title = t("Upgrade ke akses selamanya");
    subtitle = t("Akses kamu saat ini aktif sampai {date}.", { date: formatDateCompact(access.endsAt, undefined, lang) });
  } else if (access.state === "expired") {
    subtitle = t("Masa aktif berakhir. Data tetap aman.");
  }

  return (
    <main className="min-h-dvh bg-plum-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <FocusHeader />

        <h1 className="mt-10 text-center font-display text-[32px] leading-10 font-medium text-neutral-900 sm:text-[36px] sm:leading-[44px]">{title}</h1>
        <p className="mt-2 text-center text-[13px] text-neutral-600">{subtitle}</p>

        <ActivationClient
          plans={plans}
          pricing={pricing}
          isUpgrade={!!owned}
          showCode={!owned}
          clientKey={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? ""}
          isProduction={process.env.MIDTRANS_IS_PRODUCTION === "true"}
        />

        <p className="mt-10 text-center text-xs text-neutral-500">{t("Butuh bantuan?")}{" "}<Link href="/akun/bantuan" className="underline">{t("Hubungi kami")}</Link> · <Link href="/privasi" className="underline">{t("Kebijakan privasi")}</Link>
        </p>
      </div>
    </main>
  );
}
