"use client";

import { createClient } from "@/lib/supabase/client";
import { requestUpload } from "@/features/storage/actions";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// Kompres gambar ke WebP sebelum unggah (hemat kuota penyimpanan)
async function compressImage(file: File, maxSide = 1600): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

// Unggah langsung dari browser ke penyimpanan (Cloudflare R2 atau Supabase) memakai URL dari server
export async function uploadProjectFile(projectId: string, folder: "documents" | "gifts" | "cover", file: File) {
  if (!ALLOWED_MIME.includes(file.type)) throw new Error("Format file harus PDF, JPG, PNG, atau WEBP.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Ukuran file maksimal 10 MB.");
  const body = await compressImage(file);
  const mime = body !== file ? "image/webp" : file.type;
  const fileName = body !== file ? file.name.replace(/\.[^.]+$/, "") + ".webp" : file.name;

  const res = await requestUpload(projectId, folder, fileName, mime, body.size);
  if (!res.ok) throw new Error(res.error);
  const t = res.ticket;

  if (t.driver === "r2") {
    const put = await fetch(t.url, { method: "PUT", headers: t.headers, body });
    if (!put.ok) throw new Error(`Unggah gagal (${put.status}). Cek pengaturan CORS bucket R2.`);
  } else {
    const { error } = await createClient().storage.from("project-files").uploadToSignedUrl(t.key, t.token, body, { contentType: mime });
    if (error) throw new Error(error.message);
  }
  return { path: t.key, size: body.size, mime, fileName };
}
