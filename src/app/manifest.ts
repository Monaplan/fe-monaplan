import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/mulai",
    name: SITE.shortTitle,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/mulai",
    scope: "/",
    display: "standalone",
    background_color: "#FBF5F8",
    theme_color: SITE.themeColor,
    lang: "id",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
