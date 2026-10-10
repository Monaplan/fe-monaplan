import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTemplated } from "@/lib/email";
import type { Lang } from "@/lib/email/templates";
import { formatDateLong, formatIDR } from "@/lib/format";
import { appUrl } from "@/lib/constants";
import { mapMidtransStatus, type ProviderStatus } from "./provider";

// Terapkan status dari payment gateway ke order (dipakai webhook dan admin "cek ulang")
export async function applyProviderStatus(admin: SupabaseClient, order: any, status: ProviderStatus) {
  const outcome = mapMidtransStatus(status.transactionStatus, status.fraudStatus);
  const amountOk = Math.round(Number(status.grossAmount)) === Number(order.amount_idr);

  if (outcome.grant && amountOk) {
    const { error } = await admin.rpc("grant_license_for_order", { p_order_id: order.id });
    if (error) {
      await admin.from("orders").update({ needs_review: true, metadata: { ...order.metadata, grant_error: error.message } }).eq("id", order.id);
      return { outcome, granted: false, error: error.message };
    }
    await admin.from("orders").update({ payment_method: status.paymentType }).eq("id", order.id);
    if (order.status !== "paid") await sendReceipt(admin, order, status.paymentType);
    return { outcome, granted: true };
  }
  if (outcome.grant && !amountOk) {
    await admin.from("orders").update({ needs_review: true, metadata: { ...order.metadata, amount_mismatch: status.grossAmount } }).eq("id", order.id);
    return { outcome, granted: false, error: "AMOUNT_MISMATCH" };
  }
  // Order yang sudah digantikan order baru tidak dihidupkan lagi oleh status "pending"
  if (order.metadata?.superseded === true && outcome.status === "pending") return { outcome, granted: false };
  // Jangan turunkan order yang sudah lunas, kecuali refund atau perlu ditinjau
  if (order.status !== "paid" || outcome.status === "refunded" || outcome.review) {
    await admin.from("orders").update({
      status: outcome.status,
      needs_review: order.needs_review || outcome.review,
      payment_method: status.paymentType ?? order.payment_method,
    }).eq("id", order.id);
    if (outcome.revoke) {
      await admin.from("licenses")
        .update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_reason: "Refund pembayaran" })
        .eq("order_id", order.id);
    }
  }
  return { outcome, granted: false };
}

async function sendReceipt(admin: SupabaseClient, order: any, method: string | null) {
  const [{ data: profile }, { data: license }, { data: plan }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", order.user_id).single(),
    admin.from("licenses").select("ends_at").eq("order_id", order.id).maybeSingle(),
    admin.from("plans").select("name").eq("id", order.plan_id).single(),
  ]);
  if (!profile) return;
  const lang: Lang = profile.language === "en" ? "en" : "id";
  const masa = license?.ends_at ? (lang === "en" ? `Active until ${formatDateLong(license.ends_at)}` : `Aktif sampai ${formatDateLong(license.ends_at)}`) : lang === "en" ? "Lifetime" : "Selamanya";
  await admin.from("notifications").insert({
    user_id: order.user_id,
    type: "payment_succeeded",
    title: lang === "en" ? "Payment received" : "Pembayaran berhasil",
    body: `${plan?.name ?? (lang === "en" ? "Plan" : "Paket")} · ${masa}`,
    link_path: "/akun/tagihan",
    dedupe_key: `payment_succeeded:${order.id}:in_app`,
  });
  const discount = Number(order.discount_idr ?? 0) > 0 ? `${order.promo_name ?? "Promo"} (-${formatIDR(order.discount_idr)})` : null;
  await sendTemplated(profile.email, lang, {
    kind: "receipt", name: profile.full_name ?? profile.email.split("@")[0], orderNumber: order.order_number, plan: plan?.name ?? "-",
    amount: formatIDR(order.amount_idr), method: method ?? "-", validity: masa, discount, url: `${appUrl()}/akun/tagihan`,
  });
}
