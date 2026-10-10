// Nilai bonus untuk bagian landing dan Aktivasi. Ini angka pemasaran, bukan harga jual terpisah: ubah di sini bila perlu.
export const BONUSES = [
  { key: "rona", name: "Rona Impian", value: 30_000, href: "rona-impian" },
  { key: "honeymoon", name: "Honeymoon Planner", value: 55_000, href: "honeymoon-planner" },
] as const;

export const BONUS_TOTAL = BONUSES.reduce((s, b) => s + b.value, 0);
