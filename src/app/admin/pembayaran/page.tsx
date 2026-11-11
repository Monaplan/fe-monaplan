import { requireAdmin } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { PaymentClient } from "./payment-client";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Pembayaran") };
}

export default async function PaymentPage() {
  await requireAdmin();
  const { payment } = await getSettings();
  return <PaymentClient enabled={payment.enabled} storeUrl={payment.storeUrl} />;
}
