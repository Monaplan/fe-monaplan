import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.shortTitle,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/mulai",
    display: "standalone",
    background_color: "#FBF5F8",
    theme_color: SITE.themeColor,
    lang: "id",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
