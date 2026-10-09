import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/midtrans";
import { applyProviderStatus } from "@/lib/payments/process";

// Dibaca halaman /checkout/selesai (polling). Jalur utama pemberian akses tetap webhook Midtrans.
// Cadangan: bila order masih pending (webhook terlambat atau tidak bisa menjangkau server, misal di localhost),
// status ditanyakan langsung ke API Midtrans dengan server key, sama seperti tombol "Cek ulang" admin.
const lastCheck = new Map<string, number>();
const CHECK_EVERY_MS = 8000;

export async function GET(_req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const supabase = await createClient();
  // RLS orders_select_own: hanya pemilik order yang bisa membaca
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, amount_idr, paid_at, plans(name, type)")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (data.status === "pending" && process.env.MIDTRANS_SERVER_KEY && Date.now() - (lastCheck.get(orderNumber) ?? 0) > CHECK_EVERY_MS) {
    lastCheck.set(orderNumber, Date.now());
    try {
      const status = await getPaymentProvider().getStatus(orderNumber);
      if (status.transactionStatus && status.transactionStatus !== "pending") {
        const admin = createAdminClient();
        const { data: order } = await admin.from("orders").select("*").eq("id", data.id).single();
        if (order) await applyProviderStatus(admin, order, status);
        const { data: fresh } = await supabase.from("orders").select("id, order_number, status, amount_idr, paid_at, plans(name, type)").eq("id", data.id).single();
        return NextResponse.json(fresh ?? data);
      }
    } catch {
      // Gagal menghubungi Midtrans: biarkan polling berikutnya mencoba lagi
    }
  }
  return NextResponse.json(data);
}
