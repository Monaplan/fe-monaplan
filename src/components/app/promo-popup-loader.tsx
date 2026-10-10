import "server-only";
import { getAuthUser, getMyAccess } from "@/lib/access";
import { getPricingContext } from "@/lib/settings";
import { formatIDR } from "@/lib/format";
import { priceFor, promoExhausted, promoState } from "@/lib/pricing";
import { PromoPopup, type PopupPromo } from "./promo-popup";

// Memuat promo berpopup yang sedang berjalan dan cocok dengan penonton. Tanpa promo berpopup, tidak ada pekerjaan lain:
// getPricingContext() sudah di-cache per permintaan, jadi tidak menambah query.
export async function PromoPopupLoader({ plans = [] }: { plans?: { id: string; name: string; price_idr: number }[] }) {
  const user = await getAuthUser();
  const { promoEnabled, promos } = await getPricingContext(user?.id);
  if (!promoEnabled) return null;
  const live = promos.filter((p) => p.popup_enabled && promoState(p).state === "live" && !promoExhausted(p));
  if (!live.length) return null;

  let viewer: "guest" | "no_license" | "trial" | "licensed" = "guest";
  if (user) {
    const a = await getMyAccess();
    viewer = a.state === "none" || a.state === "expired" ? "no_license" : a.isTrial ? "trial" : "licensed";
  }
  const fits = (aud: string | undefined) => !aud || aud === "all" || aud === viewer;

  const list: PopupPromo[] = live
    .filter((p) => fits(p.popup_audience))
    .map((p) => ({ p, st: promoState(p) }))
    // Yang paling cepat berakhir tampil dulu
    .sort((a, b) => (a.p.ends_at ? Date.parse(a.p.ends_at) : Infinity) - (b.p.ends_at ? Date.parse(b.p.ends_at) : Infinity))
    .map(({ p, st }) => {
      // Harga paket termurah yang memenuhi promo ini (kode ikut dihitung); null bila tak ada paket yang cocok
      const priced = plans
        .map((pl) => ({ pl, r: priceFor(pl, [p], true, Date.now(), p.code) }))
        .filter((x) => x.r.promo)
        .sort((a, b) => a.r.final - b.r.final)[0];
      return {
      id: p.id,
      code: p.code ?? null,
      title: p.popup_title || p.name,
      text: p.popup_text ?? null,
      cta: p.popup_cta ?? null,
      label: p.discount_type === "percent" ? `${p.discount_value}%` : formatIDR(p.discount_value),
      endsAt: p.ends_at,
      daysLeft: st.daysLeft,
      price: priced ? { plan: priced.pl.name, original: priced.r.original, final: priced.r.final } : null,
    };
    });
  if (!list.length) return null;
  return <PromoPopup promos={list} />;
}
