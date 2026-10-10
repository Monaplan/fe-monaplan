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
  code?: string | null;
  max_uses?: number | null;
  uses?: number; // dihitung server: order lunas ditambah order pending milik orang lain yang belum kedaluwarsa
  popup_enabled?: boolean;
  popup_title?: string | null;
  popup_text?: string | null;
  popup_cta?: string | null;
  popup_audience?: "all" | "guest" | "no_license" | "trial";
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

export type PromoState = { state: "inactive" | "scheduled" | "live" | "ended"; daysLeft: number | null };

// Status dari periode promo. daysLeft dihitung ke tanggal berakhir (null bila tanpa batas).
export function promoState(p: Promo, now = Date.now()): PromoState {
  if (!p.is_active) return { state: "inactive", daysLeft: null };
  if (p.starts_at && Date.parse(p.starts_at) > now) return { state: "scheduled", daysLeft: null };
  if (p.ends_at && Date.parse(p.ends_at) <= now) return { state: "ended", daysLeft: 0 };
  return { state: "live", daysLeft: p.ends_at ? Math.max(0, Math.ceil((Date.parse(p.ends_at) - now) / 86_400_000)) : null };
}

// Kuota pemakaian habis bila batas diisi dan pemakaian sudah mencapainya
export const promoExhausted = (p: Promo) => p.max_uses != null && (p.uses ?? 0) >= p.max_uses;

export const normalizeCode = (c: string | null | undefined) => (c ?? "").trim().toUpperCase();

export type CodeCheck = { ok: true; promo: Promo } | { ok: false; reason: "empty" | "not_found" | "not_started" | "ended" | "inactive" | "other_plan" | "exhausted" };

// Memeriksa kode promo yang diketik pengguna untuk satu paket. Alasan gagal dibedakan agar pesannya jelas.
export function checkPromoCode(code: string | null | undefined, planId: string, promos: Promo[], now = Date.now()): CodeCheck {
  const c = normalizeCode(code);
  if (!c) return { ok: false, reason: "empty" };
  const promo = promos.find((p) => p.code && normalizeCode(p.code) === c);
  if (!promo) return { ok: false, reason: "not_found" };
  if (promo.plan_id && promo.plan_id !== planId) return { ok: false, reason: "other_plan" };
  const st = promoState(promo, now).state;
  if (st === "scheduled") return { ok: false, reason: "not_started" };
  if (st === "ended") return { ok: false, reason: "ended" };
  if (st === "inactive") return { ok: false, reason: "inactive" };
  if (promoExhausted(promo)) return { ok: false, reason: "exhausted" };
  return { ok: true, promo };
}

export function discountOf(p: Promo, original: number) {
  const raw = p.discount_type === "percent" ? Math.floor((original * p.discount_value) / 100) : p.discount_value;
  const maxDiscount = Math.max(0, original - Math.min(original, MIN_CHARGE_IDR));
  return Math.max(0, Math.min(raw, maxDiscount));
}

// Pilih promo yang paling menguntungkan pembeli. enabled=false mematikan semua promo (saklar admin).
// Promo berkode hanya dihitung bila kode yang diketik cocok; promo tanpa kode berlaku otomatis.
export function priceFor(plan: { id: string; price_idr: number }, promos: Promo[], enabled: boolean, now = Date.now(), code?: string | null): Priced {
  const original = Number(plan.price_idr);
  if (!enabled || original <= 0) return { original, discount: 0, final: original, promo: null };
  let best: { promo: Promo; discount: number } | null = null;
  const typed = normalizeCode(code);
  for (const p of promos) {
    if (!promoIsLive(p, now) || (p.plan_id && p.plan_id !== plan.id) || promoExhausted(p)) continue;
    if (p.code && normalizeCode(p.code) !== typed) continue;
    const d = discountOf(p, original);
    if (d > 0 && (!best || d > best.discount)) best = { promo: p, discount: d };
  }
  return best
    ? { original, discount: best.discount, final: original - best.discount, promo: best.promo }
    : { original, discount: 0, final: original, promo: null };
}

// ---------- Upgrade antar tingkat paket ----------

export type OwnedLifetime = { licenseId: string; tier: number; planName: string; creditIdr: number };

export type Quote = Priced & { credit: number; payable: number; upgradeFromLicenseId: string | null };

// Kredit upgrade = total yang sudah dibayar untuk lisensi selamanya sekarang: nominal order lisensi itu
// ditambah kredit yang dulu dipakai untuk mencapainya. Lisensi dari kode akses atau pemberian admin tanpa kredit.
export function creditOf(license: { source: string }, order: { amount_idr: number; credit_idr?: number | null } | null): number {
  if (license.source !== "payment" || !order) return 0;
  return Math.max(0, Number(order.amount_idr) + Number(order.credit_idr ?? 0));
}

// Harga yang harus dibayar untuk paket tujuan. Mengembalikan null bila paket itu bukan peningkatan
// (tier sama atau lebih rendah dari yang sudah dimiliki). Tanpa kepemilikan selamanya, tidak ada kredit.
export function upgradeQuote(
  target: { id: string; price_idr: number; tier: number },
  owned: OwnedLifetime | null,
  promos: Promo[],
  promoEnabled: boolean,
  now = Date.now(),
  code?: string | null,
): Quote | null {
  if (owned && target.tier <= owned.tier) return null;
  const base = priceFor(target, promos, promoEnabled, now, code);
  if (!owned) return { ...base, credit: 0, payable: base.final, upgradeFromLicenseId: null };
  // Kredit tidak boleh menurunkan total di bawah batas minimum Midtrans
  const credit = Math.max(0, Math.min(owned.creditIdr, base.final - Math.min(base.final, MIN_CHARGE_IDR)));
  return { ...base, credit, payable: base.final - credit, upgradeFromLicenseId: owned.licenseId };
}
