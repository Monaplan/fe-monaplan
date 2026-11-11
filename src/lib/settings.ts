import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Promo } from "@/lib/pricing";
import { ttl } from "@/lib/ttl-cache";
import { normalizeInstagram, normalizeWhatsapp, type ContactInfo } from "@/lib/support";

export type AppSettings = {
  trial: { enabled: boolean; days: number };
  promo: { enabled: boolean };
  // enabled = bayar lewat website (Midtrans). Mati: penjualan lewat toko, akses diaktifkan dengan kode akses.
  payment: { enabled: boolean; storeUrl: string | null };
  // Profil Monaplan (kontak yang tampil ke pengguna). Kosong berarti memakai env.
  profile: ContactInfo;
};

// Dipakai bila tabel app_settings belum ada (migrasi belum dijalankan): fitur baru tetap mati
// Pembayaran website tetap menyala sampai admin mematikannya, supaya perilaku lama tidak berubah diam-diam
const DEFAULTS: AppSettings = { trial: { enabled: false, days: 3 }, promo: { enabled: false }, payment: { enabled: true, storeUrl: null }, profile: { whatsapp: null, email: null, instagram: null, hours: null } };

// Hanya tautan https yang dipakai sebagai tujuan tombol, bila admin salah ketik atau menyimpan skema lain
export function cleanStoreUrl(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim() || v.length > 500) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export const getSettings = cache((): Promise<AppSettings> => ttl("settings", 30_000, loadSettings));

async function loadSettings(): Promise<AppSettings> {
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
      payment: { enabled: byKey.payment?.enabled !== false, storeUrl: cleanStoreUrl(byKey.payment?.store_url) },
      profile: {
        whatsapp: normalizeWhatsapp(byKey.profile?.whatsapp as string | undefined),
        email: typeof byKey.profile?.email === "string" && byKey.profile.email.includes("@") ? byKey.profile.email : null,
        instagram: normalizeInstagram(byKey.profile?.instagram as string | undefined),
        hours: typeof byKey.profile?.hours === "string" && byKey.profile.hours.trim() ? byKey.profile.hours.trim().slice(0, 80) : null,
      },
    };
  } catch {
    return DEFAULTS;
  }
}

// Promo yang sedang dipertimbangkan untuk harga. Penyaringan tanggal dilakukan di priceFor().
// userId: order pending milik pengguna ini tidak dihitung sebagai pemakaian, supaya dia tidak terkunci oleh ordernya sendiri.
// Tanpa userId hasilnya sama untuk semua pengunjung, jadi disimpan singkat di memori
export const getPromos = cache((userId?: string): Promise<Promo[]> => (userId ? loadPromos(userId) : ttl("promos", 30_000, () => loadPromos())));

async function loadPromos(userId?: string): Promise<Promo[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("promos").select("*").eq("is_active", true);
    if (error || !data) return [];
    const promos = data.map((p) => ({ ...p, discount_value: Number(p.discount_value), uses: 0 })) as Promo[];
    if (promos.some((p) => p.max_uses != null)) {
      const { data: rows } = await admin.from("orders").select("promo_id, user_id, status, expires_at").not("promo_id", "is", null).in("status", ["paid", "pending"]).limit(20000);
      const now = Date.now();
      for (const o of rows ?? []) {
        const counted = o.status === "paid" || (o.user_id !== userId && !!o.expires_at && Date.parse(o.expires_at as string) > now);
        const p = counted ? promos.find((x) => x.id === o.promo_id) : undefined;
        if (p) p.uses = (p.uses ?? 0) + 1;
      }
    }
    return promos;
  } catch {
    return [];
  }
}

// Satu panggilan untuk halaman yang menampilkan harga
export const getPricingContext = cache(async (userId?: string) => {
  const [settings, promos] = await Promise.all([getSettings(), getPromos(userId)]);
  return { promoEnabled: settings.promo.enabled, promos };
});

// Kontak yang dipakai di seluruh aplikasi: isian admin, dan env lama (NEXT_PUBLIC_SUPPORT_WHATSAPP, SUPPORT_EMAIL) bila kosong.
// Dibaca di layout utama (semua halaman), jadi database yang lambat tidak boleh menahan halaman: lewat 1,5 detik dipakai env saja.
export const getContact = cache(async (): Promise<ContactInfo> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settings = await Promise.race([getSettings(), new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 1500); })]);
  clearTimeout(timer);
  const profile = settings?.profile;
  return {
    whatsapp: profile?.whatsapp ?? normalizeWhatsapp(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP),
    email: profile?.email ?? (process.env.SUPPORT_EMAIL?.includes("@") ? process.env.SUPPORT_EMAIL : null),
    instagram: profile?.instagram ?? null,
    hours: profile?.hours ?? null,
  };
});
