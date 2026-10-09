// amountIdr = nominal akhir yang dibayar. Bila ada promo, originalIdr - discountIdr harus sama dengan amountIdr.
export type CheckoutOrder = {
  orderNumber: string;
  amountIdr: number;
  planId: string;
  planName: string;
  originalIdr?: number;
  discountIdr?: number;
  promoId?: string | null;
  promoName?: string | null;
};
export type Customer = { name: string | null; email: string };

export type ProviderStatus = {
  orderNumber: string;
  transactionId: string;
  transactionStatus: string;
  fraudStatus: string | null;
  paymentType: string | null;
  grossAmount: string;
  statusCode: string;
  raw: unknown;
};

export type VerifiedNotification = ProviderStatus & { signatureValid: boolean };

export interface PaymentProvider {
  name: string;
  createCheckout(order: CheckoutOrder, customer: Customer): Promise<{ token: string; redirectUrl: string }>;
  verifyNotification(payload: unknown): Promise<VerifiedNotification>;
  getStatus(orderNumber: string): Promise<ProviderStatus>;
}

export type OrderOutcome = { status: "paid" | "pending" | "failed" | "cancelled" | "expired" | "refunded"; grant: boolean; review: boolean; revoke: boolean };

// Pemetaan status Midtrans ke status order (PRD 7.2)
export function mapMidtransStatus(transactionStatus: string, fraudStatus: string | null): OrderOutcome {
  switch (transactionStatus) {
    case "capture":
      return fraudStatus === "accept"
        ? { status: "paid", grant: true, review: false, revoke: false }
        : { status: "pending", grant: false, review: true, revoke: false };
    case "settlement":
      return { status: "paid", grant: true, review: false, revoke: false };
    case "deny":
      return { status: "failed", grant: false, review: false, revoke: false };
    case "cancel":
      return { status: "cancelled", grant: false, review: false, revoke: false };
    case "expire":
      return { status: "expired", grant: false, review: false, revoke: false };
    case "refund":
      return { status: "refunded", grant: false, review: false, revoke: true };
    case "partial_refund":
      return { status: "paid", grant: false, review: true, revoke: false };
    default:
      return { status: "pending", grant: false, review: false, revoke: false };
  }
}
