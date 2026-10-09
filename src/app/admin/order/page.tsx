import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { OrderRow } from "./order-row";

export const metadata = { title: "Order" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; review?: string }> }) {
  await requireAdmin();
  const { q, status, review } = await searchParams;
  const admin = createAdminClient();

  let userIds: string[] | null = null;
  if (q && q.includes("@")) {
    const { data } = await admin.from("profiles").select("id").ilike("email", `%${q.replace(/[%_]/g, "")}%`).limit(50);
    userIds = (data ?? []).map((p) => p.id);
  }
  let query = admin.from("orders").select("*, plans(name), profiles(email), payment_events(transaction_status, payment_type, signature_valid, received_at, raw_payload)")
    .order("created_at", { ascending: false }).limit(100);
  if (status) query = query.eq("status", status);
  if (review) query = query.eq("needs_review", true);
  if (userIds) query = query.in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  else if (q) query = query.ilike("order_number", `%${q.replace(/[%_]/g, "")}%`);
  const { data: orders } = await query;

  return (
    <>
      <PageHeader title="Order" />
      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Nomor order atau email" className="max-w-xs" />
        <Select name="status" defaultValue={status ?? ""} className="w-auto">
          <option value="">Semua status</option>
          {["pending", "paid", "failed", "expired", "cancelled", "refunded"].map((s) => <option key={s}>{s}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="review" value="1" defaultChecked={!!review} className="accent-plum-600" />Perlu ditinjau</label>
        <Button type="submit" variant="secondary">Terapkan</Button>
      </form>
      <Card className="p-0 sm:p-0">
        {(orders ?? []).length === 0 && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">Tidak ada order.</p>}
        {(orders ?? []).map((o: any) => <OrderRow key={o.id} order={o} />)}
      </Card>
    </>
  );
}
