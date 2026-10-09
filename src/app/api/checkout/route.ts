import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeLicenseState } from "@/lib/access";
import { generateOrderNumber } from "@/lib/codes";
import { getPaymentProvider } from "@/lib/payments/midtrans";
import { priceFor } from "@/lib/pricing";
import { getPricingContext } from "@/lib/settings";

const Body = z.object({ plan_id: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  // Harga selalu dari tabel plans di server
  const { data: plan } = await supabase.from("plans").select("*").eq("id", parsed.data.plan_id).maybeSingle();
  if (!plan || plan.code === "TRIAL" || plan.price_idr <= 0) return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });

  // Promo dihitung ulang di server; nominal dari browser tidak pernah dipercaya
  const { promoEnabled, promos } = await getPricingContext();
  const priced = priceFor(plan, promos, promoEnabled);

  const { data: licenses } = await supabase.from("licenses").select("status, starts_at, ends_at");
  if (computeLicenseState(licenses ?? []).state === "lifetime") {
    return NextResponse.json({ error: "ALREADY_LIFETIME", message: "Akunmu sudah punya akses selamanya." }, { status: 409 });
  }

  const admin = createAdminClient();
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
  if (existing && existing.amount_idr === priced.final && (existing.promo_id ?? null) === (priced.promo?.id ?? null)) {
    return NextResponse.json({ token: existing.provider_token, redirectUrl: existing.provider_redirect_url, orderNumber: existing.order_number });
  }

  const orderNumber = generateOrderNumber();
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: auth.user.id,
      plan_id: plan.id,
      amount_idr: priced.final,
      ...(priced.promo && { original_amount_idr: priced.original, discount_idr: priced.discount, promo_id: priced.promo.id, promo_name: priced.promo.name }),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    })
    .select()
    .single();
  if (error || !order) return NextResponse.json({ error: "ORDER_FAILED" }, { status: 500 });

  try {
    const checkout = await getPaymentProvider().createCheckout(
      {
        orderNumber, amountIdr: priced.final, planId: plan.id, planName: plan.name,
        originalIdr: priced.original, discountIdr: priced.discount, promoId: priced.promo?.id ?? null, promoName: priced.promo?.name ?? null,
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
