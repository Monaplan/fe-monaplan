import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOrderNumber } from "@/lib/codes";
import { getPaymentProvider } from "@/lib/payments/midtrans";
import { checkPromoCode, upgradeQuote } from "@/lib/pricing";
import { rateLimited } from "@/lib/rate-limit";
import { clientIp } from "@/lib/codes";
import { getOwnedLifetime } from "@/lib/upgrade";
import { getPricingContext } from "@/lib/settings";
import { supersedePending } from "@/lib/order-cleanup";

const Body = z.object({ plan_id: z.string().uuid(), promo_code: z.string().trim().max(40).optional() });

const PROMO_MESSAGES = {
  not_found: "Kode promo tidak ditemukan.",
  not_started: "Kode promo belum berlaku.",
  ended: "Kode promo sudah berakhir.",
  inactive: "Kode promo tidak aktif.",
  other_plan: "Kode promo ini tidak berlaku untuk paket yang dipilih.",
  empty: "Kode promo kosong.",
  exhausted: "Kuota kode promo sudah habis.",
} as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  // Halaman Aktivasi membuat pesanan otomatis saat dibuka, jadi permintaan beruntun per pengguna dibatasi
  if (rateLimited(`checkout:${auth.user.id}`, 20)) return NextResponse.json({ error: "RATE_LIMITED", message: "Terlalu banyak permintaan pembayaran. Coba lagi sebentar lagi." }, { status: 429 });
  if (parsed.data.promo_code && rateLimited(`promo:${auth.user.id}:${clientIp(request.headers) ?? "-"}`, 12)) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Terlalu banyak percobaan kode. Coba lagi sebentar lagi." }, { status: 429 });
  }

  // Harga selalu dari tabel plans di server
  const { data: plan } = await supabase.from("plans").select("*").eq("id", parsed.data.plan_id).maybeSingle();
  if (!plan || plan.code === "TRIAL" || plan.price_idr <= 0) return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });

  // Promo dihitung ulang di server; nominal dari browser tidak pernah dipercaya
  const { promoEnabled, promos } = await getPricingContext(auth.user.id);
  const admin = createAdminClient();

  // Pemilik akses selamanya hanya boleh membeli paket bertingkat lebih tinggi, dan membayar selisihnya
  const owned = await getOwnedLifetime(admin, auth.user.id);
  // Kode yang diketik harus berlaku; kode salah ditolak dengan alasan, bukan diam-diam tanpa potongan
  let code: string | null = null;
  if (parsed.data.promo_code) {
    if (!promoEnabled) return NextResponse.json({ error: "INVALID_PROMO", message: "Promo sedang tidak aktif." }, { status: 400 });
    const chk = checkPromoCode(parsed.data.promo_code, plan.id, promos);
    if (!chk.ok) return NextResponse.json({ error: "INVALID_PROMO", message: PROMO_MESSAGES[chk.reason] }, { status: 400 });
    code = parsed.data.promo_code;
  }
  const quote = upgradeQuote({ id: plan.id, price_idr: plan.price_idr, tier: Number(plan.tier ?? 1) }, owned, promos, promoEnabled, Date.now(), code);
  if (!quote) {
    return NextResponse.json({ error: "ALREADY_LIFETIME", message: "Akunmu sudah punya paket ini atau yang lebih tinggi." }, { status: 409 });
  }
  const priced = { ...quote, final: quote.payable };
  const { data: profile } = await admin.from("profiles").select("email, full_name").eq("id", auth.user.id).single();

  // Pakai ulang order pending yang masih berlaku untuk paket yang sama
  const { data: existing } = await admin
    .from("orders")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("plan_id", plan.id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .not("provider_token", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing && existing.amount_idr === priced.final && (existing.promo_id ?? null) === (priced.promo?.id ?? null) && (existing.credit_idr ?? 0) === quote.credit) {
    return NextResponse.json({ token: existing.provider_token, redirectUrl: existing.provider_redirect_url, orderNumber: existing.order_number });
  }

  // Order pending lama (harga atau promo berbeda) tidak lagi dipakai, jangan dibiarkan menumpuk
  await supersedePending(admin, auth.user.id);

  const orderNumber = generateOrderNumber();
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: auth.user.id,
      plan_id: plan.id,
      amount_idr: priced.final,
      ...((priced.promo || quote.credit > 0) && { original_amount_idr: priced.original, discount_idr: priced.discount, promo_id: priced.promo?.id ?? null, promo_name: priced.promo?.name ?? null }),
      ...(quote.credit > 0 && { credit_idr: quote.credit, upgrade_from_license_id: quote.upgradeFromLicenseId }),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    })
    .select()
    .single();
  if (error || !order) return NextResponse.json({ error: "ORDER_FAILED" }, { status: 500 });

  try {
    const checkout = await getPaymentProvider().createCheckout(
      {
        orderNumber, amountIdr: priced.final, planId: plan.id, planName: plan.name,
        originalIdr: priced.original, discountIdr: priced.discount, creditIdr: quote.credit, promoId: priced.promo?.id ?? null, promoName: priced.promo?.name ?? null,
      },
      { name: profile?.full_name ?? null, email: profile?.email ?? auth.user.email! },
    );
    await admin.from("orders").update({ provider_token: checkout.token, provider_redirect_url: checkout.redirectUrl }).eq("id", order.id);
    return NextResponse.json({ token: checkout.token, redirectUrl: checkout.redirectUrl, orderNumber });
  } catch (e) {
    await admin.from("orders").update({ status: "failed", metadata: { error: String(e) } }).eq("id", order.id);
    return NextResponse.json({ error: "PROVIDER_ERROR", message: "Pembayaran sedang tidak bisa diproses. Coba lagi sebentar lagi." }, { status: 502 });
  }
}
