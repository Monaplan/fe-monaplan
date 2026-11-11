import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { buildLedger, monthRange, type ExpenseRow, type LedgerRow, type OrderRow, type SaleRow } from "@/lib/finance";

type Admin = ReturnType<typeof createAdminClient>;

// Buku kas satu rentang bulan (inklusif): pesanan website lunas, penjualan manual yang tidak di-refund, dan pengeluaran.
// missing = tabel keuangan belum ada (migrasi belum dijalankan); pesanan website tetap terbaca.
export async function loadLedger(admin: Admin, fromMonth: string, toMonth: string): Promise<{ rows: LedgerRow[]; missing: boolean }> {
  const from = monthRange(fromMonth), to = monthRange(toMonth);
  const [orders, sales, expenses] = await Promise.all([
    admin.from("orders").select("id, order_number, amount_idr, paid_at, payment_method, plans(name), profiles(email)").eq("status", "paid").gte("paid_at", from.fromIso).lt("paid_at", to.toIso).limit(10000),
    admin.from("sales").select("id, sold_on, buyer_name, channel, gross_idr, fee_idr, status, reference, plans(name)").gte("sold_on", from.fromDate).lt("sold_on", to.toDate).limit(10000),
    admin.from("expenses").select("id, spent_on, category, description, amount_idr").gte("spent_on", from.fromDate).lt("spent_on", to.toDate).limit(10000),
  ]);
  const missing = !!(sales.error || expenses.error);
  return {
    rows: buildLedger({ orders: (orders.data ?? []) as unknown as OrderRow[], sales: (sales.data ?? []) as unknown as SaleRow[], expenses: (expenses.data ?? []) as unknown as ExpenseRow[] }),
    missing,
  };
}
