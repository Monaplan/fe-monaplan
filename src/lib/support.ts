// Informasi kontak Monaplan yang tampil ke pengguna. Diatur admin di menu Profil Monaplan; env hanya cadangan bila kosong.
export type ContactInfo = { whatsapp: string | null; email: string | null; instagram: string | null; hours: string | null };
export const EMPTY_CONTACT: ContactInfo = { whatsapp: null, email: null, instagram: null, hours: null };

// Nomor WhatsApp dalam format internasional tanpa tanda (62812…). Boleh ditulis 08xx, +62xx, atau 62xx; null bila tidak masuk akal.
export function normalizeWhatsapp(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  const n = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("62") ? digits : `62${digits}`;
  return n.length >= 9 && n.length <= 15 ? n : null;
}

export function whatsappLink(number: string | null, text?: string): string | null {
  if (!number) return null;
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

// Nama akun Instagram dari "@nama", "nama", atau tautan profil
export function normalizeInstagram(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v : null;
}

export const instagramUrl = (handle: string) => `https://instagram.com/${handle}`;
