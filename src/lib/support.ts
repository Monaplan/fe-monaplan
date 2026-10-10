// Tautan WhatsApp ke admin. Nomor dari NEXT_PUBLIC_SUPPORT_WHATSAPP (boleh 08xx, +62xx, atau 62xx); kosong berarti fitur disembunyikan.
export function supportWhatsappNumber(): string | null {
  const raw = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");
  if (raw.length < 8) return null;
  return raw.startsWith("0") ? `62${raw.slice(1)}` : raw.startsWith("62") ? raw : `62${raw}`;
}

export function supportWhatsappUrl(text?: string): string | null {
  const n = supportWhatsappNumber();
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
