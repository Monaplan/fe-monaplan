// Pilihan gaya pernikahan. Gaya Umum selalu terpasang; adat hanya menambah tugas checklist dan kategori budget (di database,
// lihat migrasi 20261010000004) serta acara tambahan di bawah ini. Isi tiap adat adalah draf awal yang bisa dikoreksi.

export const WEDDING_STYLE_IDS = ["umum", "jawa", "sunda", "bali", "minang", "batak"] as const;
export type WeddingStyleId = (typeof WEDDING_STYLE_IDS)[number];

export type StyleEvent = {
  type: "siraman" | "lamaran" | "pemberkatan" | "lainnya";
  name: string;
  // Selisih hari dari tanggal pernikahan (negatif = sebelum hari H)
  dayOffset: number;
  start: string;
  end: string;
};

export const WEDDING_STYLES: Record<WeddingStyleId, { label: string; description: string; events: StyleEvent[] }> = {
  umum: {
    label: "Umum",
    description: "Checklist dan budget standar, cocok untuk pernikahan apa pun.",
    events: [],
  },
  jawa: {
    label: "Adat Jawa",
    description: "Menambah tugas weton, siraman, midodareni, dan panggih, serta acara Siraman dan Midodareni.",
    events: [
      { type: "siraman", name: "Siraman", dayOffset: -1, start: "15:00", end: "16:30" },
      { type: "lainnya", name: "Midodareni", dayOffset: -1, start: "19:00", end: "21:00" },
    ],
  },
  sunda: {
    label: "Adat Sunda",
    description: "Menambah tugas ngeuyeuk seureuh, nyawer, dan huap lingkung, serta acara Siraman dan Ngeuyeuk Seureuh.",
    events: [
      { type: "siraman", name: "Siraman", dayOffset: -1, start: "15:00", end: "16:30" },
      { type: "lainnya", name: "Ngeuyeuk Seureuh", dayOffset: -1, start: "19:00", end: "21:00" },
    ],
  },
  bali: {
    label: "Adat Bali",
    description: "Menambah tugas dewasa ayu, banten, dan mekala-kalaan, serta acara Mekala-kalaan.",
    events: [{ type: "lainnya", name: "Mekala-kalaan", dayOffset: 0, start: "06:00", end: "07:30" }],
  },
  minang: {
    label: "Adat Minang",
    description: "Menambah tugas maminang, malam bainai, dan manjapuik marapulai, serta acara Malam Bainai.",
    events: [{ type: "lainnya", name: "Malam Bainai", dayOffset: -1, start: "19:00", end: "21:00" }],
  },
  batak: {
    label: "Adat Batak",
    description: "Menambah tugas marhusip, martumpol, dan mangulosi, serta acara Martumpol.",
    events: [{ type: "pemberkatan", name: "Martumpol", dayOffset: -7, start: "10:00", end: "12:00" }],
  },
};
