"use server";

import { randomUUID } from "node:crypto";
import { getProjectContext } from "@/lib/access";
import { withI18n } from "@/i18n/translate";
import { createUploadTicket, storagePrefix, type UploadTicket } from "@/lib/storage";
import { ALLOWED_MIME, MAX_FILE_BYTES, MAX_FILE_MB } from "@/lib/limits";
import { getStorageUsage } from "@/features/documents/actions";
import { rateLimited } from "@/lib/rate-limit";

type Folder = "documents" | "gifts" | "cover" | "inspiration";
const NON_DOC_MAX_BYTES = 3 * 1024 * 1024;
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Izin dicek di server sebelum URL unggah dibuat: hanya Owner/Editor dengan lisensi aktif
export async function requestUpload(projectId: string, folder: Folder, fileName: string, contentType: string, size: number):
  Promise<{ ok: true; ticket: UploadTicket } | { ok: false; error: string }> {
  const { canWrite, project, session } = await getProjectContext(projectId);
  if (!canWrite) return { ok: false, error: "Kamu tidak punya izin mengunggah ke ruang kerja ini." };
  // Setiap tiket membuat berkas yang bisa tidak pernah dicatat, jadi jumlah tiket per pengguna dibatasi
  if (rateLimited(`upload:${session.user.id}`, 40, 10 * 60_000)) return { ok: false, error: "Terlalu banyak unggahan dalam waktu singkat. Coba lagi beberapa menit lagi." };
  if (!["documents", "gifts", "cover", "inspiration"].includes(folder)) return { ok: false, error: "Folder tidak valid." };
  if (!(ALLOWED_MIME as readonly string[]).includes(contentType)) return { ok: false, error: "Format file harus PDF, JPG, PNG, atau WEBP." };
  if (!(size > 0 && size <= MAX_FILE_BYTES)) return { ok: false, error: withI18n("Ukuran file maksimal {mb} MB.", { mb: MAX_FILE_MB }) };

  // Foto sampul, seserahan, dan inspirasi tidak masuk hitungan kuota dokumen, jadi hanya gambar kecil yang diterima
  if (folder !== "documents" && (contentType === "application/pdf" || size > NON_DOC_MAX_BYTES)) return { ok: false, error: "Foto maksimal 3 MB dan berformat JPG, PNG, atau WEBP." };

  if (folder === "documents") {
    const { used, quota } = await getStorageUsage(projectId);
    if (used + size > quota) return { ok: false, error: "Kuota penyimpanan kamu sudah penuh. Hapus beberapa dokumen dulu." };
  }

  const safe = fileName.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "file";
  const key = `${storagePrefix(project)}/${folder}/${safe}-${randomUUID().slice(0, 8)}.${EXT[contentType]}`;
  try {
    return { ok: true, ticket: await createUploadTicket(key, contentType, size) };
  } catch (e) {
    return { ok: false, error: withI18n("Penyimpanan sedang bermasalah: {error}", { error: (e as Error).message }) };
  }
}
