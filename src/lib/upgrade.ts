import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { creditOf, type OwnedLifetime } from "@/lib/pricing";

// Lisensi selamanya aktif dengan tier tertinggi milik pengguna, lengkap dengan kredit upgrade-nya
export async function getOwnedLifetime(admin: SupabaseClient, userId: string): Promise<OwnedLifetime | null> {
  const { data } = await admin
    .from("licenses")
    .select("id, source, order_id, plans(name, tier), orders(amount_idr, credit_idr)")
    .eq("user_id", userId).eq("status", "active").is("ends_at", null);
  const best = (data ?? [])
    .map((l: any) => ({ l, tier: Number(l.plans?.tier ?? 1) }))
    .sort((a, b) => b.tier - a.tier)[0];
  if (!best) return null;
  return {
    licenseId: best.l.id,
    tier: best.tier,
    planName: best.l.plans?.name ?? "",
    creditIdr: creditOf(best.l, best.l.orders ?? null),
  };
}
