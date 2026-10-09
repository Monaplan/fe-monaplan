export const PHASES = [
  { key: "m12_plus", label: "Lebih dari 12 bulan", short: "> 12 bln" },
  { key: "m12_6", label: "12 sampai 6 bulan", short: "12-6 bln" },
  { key: "m6_3", label: "6 sampai 3 bulan", short: "6-3 bln" },
  { key: "m3_1", label: "3 sampai 1 bulan", short: "3-1 bln" },
  { key: "m1", label: "1 bulan terakhir", short: "1 bln" },
  { key: "w1", label: "Minggu terakhir", short: "1 mgg" },
  { key: "hari_h", label: "Hari H", short: "Hari H" },
  { key: "pasca", label: "Setelah hari H", short: "Pasca" },
] as const;

export const PHASE_LABEL: Record<string, string> = Object.fromEntries(PHASES.map((p) => [p.key, p.label]));

export const TASK_STATUS = [
  { key: "todo", label: "Belum" },
  { key: "in_progress", label: "Dikerjakan" },
  { key: "done", label: "Selesai" },
] as const;

export const TASK_PRIORITY = [
  { key: "low", label: "Rendah" },
  { key: "medium", label: "Sedang" },
  { key: "high", label: "Tinggi" },
] as const;

export const TASK_CATEGORIES = [
  "Perencanaan", "Budget", "Tamu", "Vendor", "Busana & Rias", "Mahar & Seserahan",
  "Administrasi", "Rundown", "Hari H", "Lainnya",
];

export const VENDOR_STATUS = [
  { key: "prospek", label: "Prospek" },
  { key: "survei", label: "Survei" },
  { key: "negosiasi", label: "Negosiasi" },
  { key: "deal", label: "Deal" },
  { key: "batal", label: "Batal" },
] as const;

export const VENDOR_CATEGORIES = [
  "Venue", "Katering", "Dekorasi", "MUA", "Busana", "Dokumentasi", "Hiburan",
  "WO", "Undangan", "Souvenir", "Cincin", "Transportasi", "Lainnya",
];

export const EVENT_TYPES = [
  { key: "lamaran", label: "Lamaran" },
  { key: "pengajian", label: "Pengajian" },
  { key: "siraman", label: "Siraman" },
  { key: "akad", label: "Akad Nikah" },
  { key: "pemberkatan", label: "Pemberkatan" },
  { key: "resepsi", label: "Resepsi" },
  { key: "ngunduh_mantu", label: "Ngunduh Mantu" },
  { key: "lainnya", label: "Lainnya" },
] as const;

export const PAYMENT_KIND = [
  { key: "dp", label: "DP" },
  { key: "termin", label: "Termin" },
  { key: "pelunasan", label: "Pelunasan" },
  { key: "lainnya", label: "Lainnya" },
] as const;

export const PARTY_SIDE = [
  { key: "pria", label: "Pihak pria" },
  { key: "wanita", label: "Pihak wanita" },
  { key: "bersama", label: "Bersama" },
] as const;

export const GUEST_CATEGORY = [
  { key: "vip", label: "VIP" },
  { key: "keluarga", label: "Keluarga" },
  { key: "reguler", label: "Reguler" },
] as const;

export const RSVP_STATUS = [
  { key: "belum_respon", label: "Belum respon" },
  { key: "hadir", label: "Hadir" },
  { key: "tidak_hadir", label: "Tidak hadir" },
  { key: "ragu", label: "Masih ragu" },
] as const;

export const PURCHASE_STATUS = [
  { key: "rencana", label: "Rencana" },
  { key: "dipesan", label: "Dipesan" },
  { key: "dibeli", label: "Dibeli" },
  { key: "diterima", label: "Diterima" },
] as const;

export const DOCUMENT_CATEGORY = [
  { key: "identitas", label: "Identitas" },
  { key: "administrasi_nikah", label: "Administrasi nikah" },
  { key: "kontrak_vendor", label: "Kontrak vendor" },
  { key: "bukti_pembayaran", label: "Bukti pembayaran" },
  { key: "lainnya", label: "Lainnya" },
] as const;

export const ROLE_LABEL: Record<string, string> = { owner: "Pemilik", editor: "Editor", viewer: "Viewer" };

export const CODE_ERROR_MESSAGES: Record<string, string> = {
  CODE_INVALID_FORMAT: "Format kode belum pas. Contoh: MNP-7K2M-9QXR-4HTP.",
  CODE_NOT_FOUND: "Kode tidak ditemukan. Cek lagi huruf dan angkanya, ya.",
  CODE_ALREADY_USED: "Kode ini sudah dipakai. Hubungi penjual kode bila kamu merasa belum menggunakannya.",
  CODE_ALREADY_REDEEMED_BY_USER: "Kamu sudah pernah memakai kode ini.",
  CODE_EXPIRED: "Kode ini sudah melewati masa berlakunya.",
  CODE_REVOKED: "Kode ini sudah tidak aktif.",
  ALREADY_LIFETIME: "Akunmu sudah punya akses selamanya, jadi kode ini tidak diperlukan.",
  RATE_LIMITED: "Terlalu banyak percobaan. Coba lagi dalam {menit} menit.",
};

export const DEFAULT_TEMPLATE = `Halo {nama_tamu},

Dengan penuh rasa syukur, kami {nama_pasangan} bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir di hari bahagia kami.

{detail_acara}

Mohon kesediaannya mengonfirmasi kehadiran melalui tautan berikut:
{link_rsvp}

Terima kasih atas doa dan restunya.`;

export function labelOf<T extends { key: string; label: string }>(list: readonly T[], key: string | null | undefined) {
  return list.find((x) => x.key === key)?.label ?? key ?? "-";
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
