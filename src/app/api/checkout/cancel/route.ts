import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimited } from "@/lib/rate-limit";

const Body = z.object({ order: z.string().regex(/^MNP-\d{8}-[A-Z0-9]{6}$/) });

// Dipanggil browser saat pembeli meninggalkan halaman Aktivasi. Hanya order pending milik sendiri yang belum
// punya event pembayaran yang dibatalkan; bila ternyata dibayar, webhook tetap menjadikannya lunas.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  if (rateLimited(`cancel:${auth.user.id}`, 30)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, metadata, payment_events(id)").eq("order_number", parsed.data.order).eq("user_id", auth.user.id).eq("status", "pending").maybeSingle();
  if (!order || (order.payment_events ?? []).length > 0) return NextResponse.json({ ok: true, cancelled: false });
  await admin.from("orders").update({ status: "cancelled", metadata: { ...(order.metadata ?? {}), superseded: true, left_page: true } }).eq("id", order.id).eq("status", "pending");
  return NextResponse.json({ ok: true, cancelled: true });
}
