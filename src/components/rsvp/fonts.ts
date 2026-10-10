import { Playfair_Display, Noto_Sans_Balinese, Pinyon_Script } from "next/font/google";

// Huruf khusus undangan. preload dimatikan: berkas huruf baru diunduh bila tema yang dipakai membutuhkannya.
export const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});

export const balinese = Noto_Sans_Balinese({
  subsets: ["balinese"],
  weight: ["400", "600"],
  variable: "--font-balinese",
  display: "swap",
  preload: false,
});

export const script = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
  preload: false,
});
