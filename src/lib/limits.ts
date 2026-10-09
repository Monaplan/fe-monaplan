// Batas berkas. Satu sumber untuk server dan klien.
export const MAX_FILE_MB = 5;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
// Kuota arsip berkas per pengguna (semua proyek miliknya), bila paket tidak menentukan
export const DEFAULT_QUOTA_MB = 50;
export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
