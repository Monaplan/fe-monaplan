"use server";

import { randomUUID } from "node:crypto";
import { getProjectContext } from "@/lib/access";
import { ALLOWED_MIME, createUploadTicket, MAX_FILE_BYTES, type UploadTicket } from "@/lib/storage";
import { getStorageUsage } from "@/features/documents/actions";

type Folder = "documents" | "gifts" | "cover";
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Izin dicek di server sebelum URL unggah dibuat: hanya Owner/Editor dengan lisensi aktif
export async function requestUpload(projectId: string, folder: Folder, fileName: string, contentType: string, size: number):
  Promise<{ ok: true; ticket: UploadTicket } | { ok: false; error: string }> {
  const { canWrite } = await getProjectContext(projectId);
  if (!canWrite) return { ok: false, error: "Kamu tidak punya izin mengunggah ke ruang kerja ini." };
  if (!["documents", "gifts", "cover"].includes(folder)) return { ok: false, error: "Folder tidak valid." };
  if (!ALLOWED_MIME.includes(contentType)) return { ok: false, error: "Format file harus PDF, JPG, PNG, atau WEBP." };
  if (!(size > 0 && size <= MAX_FILE_BYTES)) return { ok: false, error: "Ukuran file maksimal 10 MB." };

  if (folder === "documents") {
    const { used, quota } = await getStorageUsage(projectId);
    if (used + size > quota) return { ok: false, error: "Kuota penyimpanan paketmu sudah penuh. Hapus beberapa dokumen dulu, ya." };
  }

  const safe = fileName.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "file";
  const key = `${projectId}/${folder}/${randomUUID()}-${safe}.${EXT[contentType]}`;
  try {
    return { ok: true, ticket: await createUploadTicket(key, contentType, size) };
  } catch (e) {
    return { ok: false, error: `Penyimpanan sedang bermasalah: ${(e as Error).message}` };
  }
}
