import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/midtrans";
import { applyProviderStatus } from "@/lib/payments/process";

// PRD 7.2: validasi signature, cek ulang status, catat event (idempoten), cocokkan nominal, beri lisensi
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload?.order_id) return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });

  const provider = getPaymentProvider();
  const admin = createAdminClient();

  const n = await provider.verifyNotification(payload);
  const { data: order } = await admin.from("orders").select("*").eq("order_number", n.orderNumber).maybeSingle();

  let { data: event, error: evErr } = await admin
    .from("payment_events")
    .insert({
      order_id: order?.id ?? null,
      provider: provider.name,
      provider_order_id: n.orderNumber,
      provider_transaction_id: n.transactionId || `no-trx-${n.orderNumber}`,
      transaction_status: n.transactionStatus,
      fraud_status: n.fraudStatus,
      payment_type: n.paymentType,
      gross_amount: n.grossAmount,
      signature_valid: n.signatureValid,
      raw_payload: payload,
    })
    .select("id")
    .single();
  if (evErr?.code === "23505") {
    // Notifikasi ganda: abaikan bila sudah diproses, lanjutkan bila percobaan sebelumnya gagal di tengah jalan
    const { data: prev } = await admin.from("payment_events").select("id, processed_at")
      .eq("provider", provider.name).eq("provider_transaction_id", n.transactionId || `no-trx-${n.orderNumber}`)
      .eq("transaction_status", n.transactionStatus).single();
    if (!prev || prev.processed_at) return NextResponse.json({ ok: true, duplicate: true });
    event = { id: prev.id };
  }
  if (!n.signatureValid) return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 403 });
  if (!order) return NextResponse.json({ ok: true, unknownOrder: true });

  let status;
  try {
    status = await provider.getStatus(n.orderNumber);
    if (!status.transactionStatus) throw new Error("empty status");
  } catch {
    // Balas non-200 agar Midtrans mengirim ulang nanti
    return NextResponse.json({ error: "STATUS_CHECK_FAILED" }, { status: 500 });
  }

  await applyProviderStatus(admin, order, status);
  if (event) await admin.from("payment_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
  return NextResponse.json({ ok: true });
}
