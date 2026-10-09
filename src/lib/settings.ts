import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Promo } from "@/lib/pricing";

export type AppSettings = {
  trial: { enabled: boolean; days: number };
  promo: { enabled: boolean };
};

// Dipakai bila tabel app_settings belum ada (migrasi belum dijalankan): fitur baru tetap mati
const DEFAULTS: AppSettings = { trial: { enabled: false, days: 3 }, promo: { enabled: false } };

export const getSettings = cache(async (): Promise<AppSettings> => {
  try {
    const { data, error } = await createAdminClient().from("app_settings").select("key, value");
    if (error || !data) return DEFAULTS;
    const byKey = Object.fromEntries(data.map((r) => [r.key, r.value as Record<string, unknown>]));
    return {
      trial: {
        enabled: byKey.trial?.enabled === true,
        days: Math.min(365, Math.max(1, Number(byKey.trial?.days) || DEFAULTS.trial.days)),
      },
      promo: { enabled: byKey.promo?.enabled === true },
    };
  } catch {
    return DEFAULTS;
  }
});

// Promo yang sedang dipertimbangkan untuk harga. Penyaringan tanggal dilakukan di priceFor().
export const getPromos = cache(async (): Promise<Promo[]> => {
  try {
    const { data, error } = await createAdminClient().from("promos").select("*").eq("is_active", true);
    if (error || !data) return [];
    return data.map((p) => ({ ...p, discount_value: Number(p.discount_value) })) as Promo[];
  } catch {
    return [];
  }
});

// Satu panggilan untuk halaman yang menampilkan harga
export const getPricingContext = cache(async () => {
  const [settings, promos] = await Promise.all([getSettings(), getPromos()]);
  return { promoEnabled: settings.promo.enabled, promos };
});
