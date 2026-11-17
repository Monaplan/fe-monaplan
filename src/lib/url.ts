// Tautan dari pengguna (Google Maps, toko seserahan, situs vendor) dipakai sebagai href di halaman yang dilihat orang lain,
// termasuk undangan publik. Hanya http dan https yang boleh: skema seperti javascript: tetap lolos validasi type="url"
// di peramban dan CSP aplikasi mengizinkan skrip inline, jadi harus ditolak di server dan sekali lagi saat ditampilkan.

// Mengembalikan alamat yang sudah dirapikan, atau null bila bukan http(s) yang sah. Tanpa skema (www.contoh.com) ditambah https://.
export function cleanHttpUrl(raw: string | null | undefined, max = 500): string | null {
  const v = (raw ?? "").trim();
  if (!v || v.length > max || /[\u0000-\u001f\u007f\s]/.test(v)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if ((u.protocol !== "http:" && u.protocol !== "https:") || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Untuk tampilan: href yang aman atau undefined. Baris lama di database yang sempat tersimpan sebelum validasi ikut tersaring.
export function safeHref(raw: string | null | undefined): string | undefined {
  return cleanHttpUrl(raw, 2000) ?? undefined;
}

export const URL_ERROR = "Tautan harus diawali http:// atau https:// dan berupa alamat yang valid.";
