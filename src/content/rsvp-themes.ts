// Tema halaman undangan. Semua gratis. Tampilan memakai variabel CSS (--rv-*) pada pembungkus halaman, jadi struktur
// konten sama dan hanya warna, huruf, bentuk foto, hiasan, serta nuansa yang berganti. Semua permukaan memakai warna
// penuh (tanpa transparansi) agar tetap tegas di atas latar berpola. Tema tidak mengikuti mode gelap aplikasi.

export const RSVP_THEME_IDS = ["elegan_minimalis", "klasik_emas", "bali", "noir_luxury", "botanical_soft"] as const;
export type RsvpThemeId = (typeof RSVP_THEME_IDS)[number];

export type RsvpOrnament = "hairline" | "frame" | "bali" | "deco" | "leaf";

export type RsvpTheme = {
  id: RsvpThemeId;
  name: string;
  description: string;
  ornament: RsvpOrnament;
  // Salam pembuka dan penutup beraksara (hanya tema Bali). Teks Latin selalu ikut tampil di bawahnya.
  greeting?: { open: { script: string; latin: string }; close: { script: string; latin: string } };
  vars: Record<`--rv-${string}`, string>;
  // Warna untuk kartu pratinjau kecil di Pengaturan
  swatch: [string, string, string];
};

// Aksara Bali ditulis dengan kode Unicode agar tidak bergantung pada pengodean berkas
export const OM_SWASTYASTU = "ᬒᬁ ᬲ᭄ᬯᬲ᭄ᬢ᭄ᬬᬲ᭄ᬢᬸ";
export const OM_SANTI = "ᬒᬁ ᬰᬵᬦ᭄ᬢᬶ ᬰᬵᬦ᭄ᬢᬶ ᬰᬵᬦ᭄ᬢᬶ ᬒᬁ";

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

// Belah ketupat bertumpuk sebagai ukiran halus di latar sampul tema Bali
const baliTile = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48' fill='none' stroke='#2A4A38' stroke-width='1'><path d='M24 4L44 24 24 44 4 24z'/><path d='M24 14L34 24 24 34 14 24z'/></svg>`,
);
// Garis diagonal tipis ala art deco untuk sampul Noir
const decoTile = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40' fill='none' stroke='#1D1C20' stroke-width='1'><path d='M0 40L40 0M-10 10L10 -10M30 50L50 30'/></svg>`,
);

export const RSVP_THEMES: Record<RsvpThemeId, RsvpTheme> = {
  elegan_minimalis: {
    id: "elegan_minimalis",
    name: "Elegan Minimalis",
    description: "Putih gading, huruf kapital berjarak, dan garis tipis. Tenang dan bersih.",
    ornament: "hairline",
    swatch: ["#FAF8F4", "#1F1B16", "#CFC7B8"],
    vars: {
      "--rv-outer": "#E9E5DC",
      "--rv-bg": "#FAF8F4",
      "--rv-bg-image": "none",
      "--rv-bg-2": "#F2EEE6",
      "--rv-card": "#FFFFFF",
      "--rv-card-border": "#DCD5C7",
      "--rv-ink": "#1F1B16",
      "--rv-muted": "#6B6357",
      "--rv-accent": "#1F1B16",
      "--rv-accent-ink": "#FAF8F4",
      "--rv-soft": "#F1EDE4",
      "--rv-danger": "#B4382F",
      "--rv-field": "#FFFFFF",
      "--rv-field-border": "#CFC7B8",
      "--rv-radius": "2px",
      "--rv-photo-radius": "2px",
      "--rv-title-case": "uppercase",
      "--rv-title-track": "0.16em",
      "--rv-name-size": "40px",
      "--rv-font": "var(--font-cormorant), Georgia, serif",
      "--rv-name-font": "var(--font-cormorant), Georgia, serif",
    },
  },
  klasik_emas: {
    id: "klasik_emas",
    name: "Klasik Emas",
    description: "Krem hangat, foto berbingkai lengkung, dan tulisan tangan berwarna emas.",
    ornament: "frame",
    swatch: ["#FBF5E6", "#A8832F", "#3B2F1E"],
    vars: {
      "--rv-outer": "#E8DCC0",
      "--rv-bg": "#FBF5E6",
      "--rv-bg-image": "none",
      "--rv-bg-2": "#F4E9CF",
      "--rv-card": "#FFFCF3",
      "--rv-card-border": "#D8C28A",
      "--rv-ink": "#3A2E1C",
      "--rv-muted": "#76674A",
      "--rv-accent": "#A8832F",
      "--rv-accent-ink": "#FFFBF0",
      "--rv-soft": "#F3E8CC",
      "--rv-danger": "#A63A2B",
      "--rv-field": "#FFFDF6",
      "--rv-field-border": "#D8C28A",
      "--rv-radius": "4px",
      "--rv-photo-radius": "999px 999px 6px 6px",
      "--rv-title-case": "none",
      "--rv-title-track": "0",
      "--rv-name-size": "58px",
      "--rv-font": "var(--font-cormorant), Georgia, serif",
      "--rv-name-font": "var(--font-script), 'Brush Script MT', cursive",
    },
  },
  bali: {
    id: "bali",
    name: "Bali",
    description: "Hijau tua dan emas dengan ukiran halus, salam Om Swastyastu dalam aksara Bali.",
    ornament: "bali",
    greeting: {
      open: { script: OM_SWASTYASTU, latin: "Om Swastyastu" },
      close: { script: OM_SANTI, latin: "Om Shanti Shanti Shanti Om" },
    },
    swatch: ["#14291F", "#D6B05C", "#F4EBD3"],
    vars: {
      "--rv-outer": "#07110C",
      "--rv-bg": "#10241A",
      "--rv-bg-image": `${baliTile}, linear-gradient(180deg, #17301F 0%, #10241A 55%, #0C1C14 100%)`,
      "--rv-bg-2": "#0C1C14",
      "--rv-card": "#18321F",
      "--rv-card-border": "#8A7338",
      "--rv-ink": "#F6EEDB",
      "--rv-muted": "#CBBF9E",
      "--rv-accent": "#D6B05C",
      "--rv-accent-ink": "#10241A",
      "--rv-soft": "#1F3D2A",
      "--rv-danger": "#FFA58F",
      "--rv-field": "#0F2118",
      "--rv-field-border": "#8A7338",
      "--rv-radius": "8px",
      "--rv-photo-radius": "999px 999px 10px 10px",
      "--rv-title-case": "none",
      "--rv-title-track": "0.01em",
      "--rv-name-size": "50px",
      "--rv-font": "var(--font-cormorant), Georgia, serif",
      "--rv-name-font": "var(--font-cormorant), Georgia, serif",
    },
  },
  noir_luxury: {
    id: "noir_luxury",
    name: "Noir Luxury",
    description: "Hitam arang dengan emas sampanye dan garis art deco. Berkelas dan dramatis.",
    ornament: "deco",
    swatch: ["#0C0C0E", "#C9A96E", "#F2EDE4"],
    vars: {
      "--rv-outer": "#050506",
      "--rv-bg": "#0C0C0E",
      "--rv-bg-image": `${decoTile}, linear-gradient(180deg, #151418 0%, #0C0C0E 60%)`,
      "--rv-bg-2": "#121115",
      "--rv-card": "#17161B",
      "--rv-card-border": "#6F5E3B",
      "--rv-ink": "#F2EDE4",
      "--rv-muted": "#A39A8A",
      "--rv-accent": "#C9A96E",
      "--rv-accent-ink": "#0C0C0E",
      "--rv-soft": "#1E1D23",
      "--rv-danger": "#FF9C8A",
      "--rv-field": "#101013",
      "--rv-field-border": "#6F5E3B",
      "--rv-radius": "2px",
      "--rv-photo-radius": "2px",
      "--rv-title-case": "uppercase",
      "--rv-title-track": "0.14em",
      "--rv-name-size": "38px",
      "--rv-font": "var(--font-playfair), Georgia, serif",
      "--rv-name-font": "var(--font-playfair), Georgia, serif",
    },
  },
  botanical_soft: {
    id: "botanical_soft",
    name: "Botanical Soft",
    description: "Hijau sage dan putih dengan ranting garis halus. Segar, lembut, tidak ramai.",
    ornament: "leaf",
    swatch: ["#F2F5EE", "#5E7F63", "#25332A"],
    vars: {
      "--rv-outer": "#DCE5D5",
      "--rv-bg": "#F4F7F0",
      "--rv-bg-image": "none",
      "--rv-bg-2": "#E8EFE2",
      "--rv-card": "#FFFFFF",
      "--rv-card-border": "#C3D1BB",
      "--rv-ink": "#25332A",
      "--rv-muted": "#58695D",
      "--rv-accent": "#4F7355",
      "--rv-accent-ink": "#FFFFFF",
      "--rv-soft": "#E6EEE0",
      "--rv-danger": "#B4382F",
      "--rv-field": "#FFFFFF",
      "--rv-field-border": "#B4C6AC",
      "--rv-radius": "16px",
      "--rv-photo-radius": "50% / 42%",
      "--rv-title-case": "none",
      "--rv-title-track": "0",
      "--rv-name-size": "52px",
      "--rv-font": "var(--font-cormorant), Georgia, serif",
      "--rv-name-font": "var(--font-cormorant), Georgia, serif",
    },
  },
};

export const DEFAULT_RSVP_THEME: RsvpThemeId = "elegan_minimalis";

export function resolveRsvpTheme(id: string | null | undefined): RsvpTheme {
  return RSVP_THEMES[(id ?? "") as RsvpThemeId] ?? RSVP_THEMES[DEFAULT_RSVP_THEME];
}
