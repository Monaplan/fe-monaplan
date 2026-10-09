import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// Hanya halaman publik. Ruang kerja, admin, akun, dan RSVP tamu sengaja tidak dimasukkan.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE.url}/privasi`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
