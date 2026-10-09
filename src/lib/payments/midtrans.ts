import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { appUrl } from "@/lib/constants";
import type { CheckoutOrder, Customer, PaymentProvider, ProviderStatus, VerifiedNotification } from "./provider";

function cfg() {
  const prod = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  return {
    serverKey,
    snapBase: prod ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com",
    apiBase: prod ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com",
    auth: "Basic " + Buffer.from(serverKey + ":").toString("base64"),
  };
}

function toStatus(j: any): ProviderStatus {
  return {
    orderNumber: String(j.order_id ?? ""),
    transactionId: String(j.transaction_id ?? ""),
    transactionStatus: String(j.transaction_status ?? ""),
    fraudStatus: j.fraud_status ?? null,
    paymentType: j.payment_type ?? null,
    grossAmount: String(j.gross_amount ?? ""),
    statusCode: String(j.status_code ?? ""),
    raw: j,
  };
}

export class MidtransProvider implements PaymentProvider {
  name = "midtrans";

  async createCheckout(order: CheckoutOrder, customer: Customer) {
    const c = cfg();
    if (!c.serverKey) throw new Error("MIDTRANS_SERVER_KEY belum diisi");
    // Promo dikirim sebagai baris diskon bernilai negatif, sehingga halaman bayar Midtrans
    // menampilkan harga asli, potongan, dan total yang sama dengan order di Monaplan
    const discount = order.discountIdr ?? 0;
    const items = [{ id: order.planId, price: order.originalIdr ?? order.amountIdr, quantity: 1, name: order.planName.slice(0, 50) }];
    if (discount > 0) items.push({ id: order.promoId ?? "PROMO", price: -discount, quantity: 1, name: `Promo ${order.promoName ?? ""}`.trim().slice(0, 50) });
    // Upgrade tier: dana yang sudah dibayar untuk paket sebelumnya dikurangkan sebagai baris kredit
    if ((order.creditIdr ?? 0) > 0) items.push({ id: "UPGRADE-CREDIT", price: -(order.creditIdr as number), quantity: 1, name: "Kredit upgrade" });
    const res = await fetch(`${c.snapBase}/snap/v1/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: c.auth },
      body: JSON.stringify({
        transaction_details: { order_id: order.orderNumber, gross_amount: order.amountIdr },
        item_details: items,
        customer_details: { first_name: customer.name ?? customer.email, email: customer.email },
        callbacks: { finish: `${appUrl()}/checkout/selesai?order=${order.orderNumber}` },
        expiry: { unit: "hours", duration: 24 },
      }),
    });
    const j = await res.json();
    if (!res.ok || !j.token) throw new Error(j.error_messages?.join(", ") ?? "Gagal membuat transaksi Midtrans");
    return { token: j.token as string, redirectUrl: j.redirect_url as string };
  }

  async verifyNotification(payload: unknown): Promise<VerifiedNotification> {
    const p = payload as Record<string, string>;
    const expected = createHash("sha512")
      .update(`${p.order_id}${p.status_code}${p.gross_amount}${cfg().serverKey}`)
      .digest("hex");
    const given = String(p.signature_key ?? "");
    const signatureValid =
      given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    return { ...toStatus(p), signatureValid };
  }

  async getStatus(orderNumber: string): Promise<ProviderStatus> {
    const c = cfg();
    const res = await fetch(`${c.apiBase}/v2/${encodeURIComponent(orderNumber)}/status`, {
      headers: { Accept: "application/json", Authorization: c.auth },
      cache: "no-store",
    });
    return toStatus(await res.json());
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new MidtransProvider();
}
