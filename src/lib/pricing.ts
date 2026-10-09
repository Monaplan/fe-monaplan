// Harga paket setelah promo. Murni fungsi, dipakai server (checkout) dan tampilan (aktivasi, landing).

export type Promo = {
  id: string;
  name: string;
  description: string | null;
  plan_id: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

export type Priced = { original: number; discount: number; final: number; promo: Promo | null };

// Midtrans menolak nominal yang terlalu kecil, jadi diskon tidak pernah menurunkan harga di bawah ini
export const MIN_CHARGE_IDR = 1000;

export function promoIsLive(p: Promo, now = Date.now()) {
  if (!p.is_active) return false;
  if (p.starts_at && Date.parse(p.starts_at) > now) return false;
  if (p.ends_at && Date.parse(p.ends_at) <= now) return false;
  return true;
}

export function discountOf(p: Promo, original: number) {
  const raw = p.discount_type === "percent" ? Math.floor((original * p.discount_value) / 100) : p.discount_value;
  const maxDiscount = Math.max(0, original - Math.min(original, MIN_CHARGE_IDR));
  return Math.max(0, Math.min(raw, maxDiscount));
}

// Pilih promo yang paling menguntungkan pembeli. enabled=false mematikan semua promo (saklar admin).
export function priceFor(plan: { id: string; price_idr: number }, promos: Promo[], enabled: boolean, now = Date.now()): Priced {
  const original = Number(plan.price_idr);
  if (!enabled || original <= 0) return { original, discount: 0, final: original, promo: null };
  let best: { promo: Promo; discount: number } | null = null;
  for (const p of promos) {
    if (!promoIsLive(p, now) || (p.plan_id && p.plan_id !== plan.id)) continue;
    const d = discountOf(p, original);
    if (d > 0 && (!best || d > best.discount)) best = { promo: p, discount: d };
  }
  return best
    ? { original, discount: best.discount, final: original - best.discount, promo: best.promo }
    : { original, discount: 0, final: original, promo: null };
}
