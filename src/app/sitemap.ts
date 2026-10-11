import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// Hanya halaman publik yang layak diindeks. Ruang kerja, admin, akun, login, dan undangan tamu sengaja tidak dimasukkan.
// Tanggal diperbarui manual saat isi halaman berubah; memakai waktu sekarang akan terlihat berubah di setiap permintaan.
const LANDING_UPDATED = new Date("2026-10-11");
const PRIVACY_UPDATED = new Date("2026-10-09");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE.url}/`, lastModified: LANDING_UPDATED, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/privasi`, lastModified: PRIVACY_UPDATED, changeFrequency: "yearly", priority: 0.3 },
  ];
}
