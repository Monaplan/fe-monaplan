import "server-only";
import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAdminClient } from "@/lib/supabase/admin";

// Penyimpanan berkas proyek. Kunci objek: {project_id}/{documents|gifts|cover}/{uuid}-{nama}.{ext}
// Driver "r2" (Cloudflare R2, S3-compatible) dipakai bila kredensial R2 lengkap,
// selain itu "supabase" (Supabase Storage) sebagai cadangan untuk development.
// Bucket selalu privat: akses hanya lewat URL bertanda tangan yang dibuat server setelah cek izin.

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const SUPABASE_BUCKET = "project-files";

export type StorageDriver = "r2" | "supabase";

export function storageDriver(): StorageDriver {
  const forced = process.env.STORAGE_DRIVER;
  if (forced === "supabase") return "supabase";
  const ready = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);
  if (forced === "r2" && !ready) throw new Error("STORAGE_DRIVER=r2 tetapi kredensial R2 belum lengkap");
  return ready ? "r2" : "supabase";
}

let s3: S3Client | null = null;
function r2() {
  if (!s3) {
    s3 = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT ?? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
      forcePathStyle: true,
      // SDK baru menambahkan checksum CRC32 ke URL presigned; browser tidak mengirimnya sehingga R2 menolak unggahan
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return s3;
}
const bucket = () => process.env.R2_BUCKET!;

export type UploadTicket =
  | { driver: "r2"; key: string; url: string; headers: Record<string, string> }
  | { driver: "supabase"; key: string; token: string };

// URL unggah sekali pakai. Untuk R2, tipe dan ukuran ikut ditandatangani sehingga tidak bisa diganti klien.
export async function createUploadTicket(key: string, contentType: string, size: number): Promise<UploadTicket> {
  if (storageDriver() === "r2") {
    const url = await getSignedUrl(r2(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType, ContentLength: size }), {
      expiresIn: 300,
      signableHeaders: new Set(["content-type", "content-length"]),
    });
    return { driver: "r2", key, url, headers: { "Content-Type": contentType } };
  }
  const { data, error } = await createAdminClient().storage.from(SUPABASE_BUCKET).createSignedUploadUrl(key);
  if (error || !data) throw new Error(error?.message ?? "Gagal membuat URL unggah");
  return { driver: "supabase", key, token: data.token };
}

// Ukuran objek yang benar-benar tersimpan, null bila tidak ada
export async function objectSize(key: string): Promise<number | null> {
  if (storageDriver() === "r2") {
    try {
      const head = await r2().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
      return head.ContentLength ?? null;
    } catch {
      return null;
    }
  }
  const dir = key.slice(0, key.lastIndexOf("/"));
  const name = key.slice(key.lastIndexOf("/") + 1);
  const { data } = await createAdminClient().storage.from(SUPABASE_BUCKET).list(dir, { search: name, limit: 1 });
  const f = data?.find((x) => x.name === name);
  return f ? Number((f.metadata as any)?.size ?? 0) : null;
}

export async function getDownloadUrl(key: string, opts: { expiresIn?: number; downloadName?: string } = {}): Promise<string | null> {
  const expiresIn = opts.expiresIn ?? 60;
  if (storageDriver() === "r2") {
    return getSignedUrl(r2(), new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ...(opts.downloadName ? { ResponseContentDisposition: `attachment; filename="${opts.downloadName.replace(/["\\\r\n]/g, "")}"` } : {}),
    }), { expiresIn });
  }
  const { data } = await createAdminClient().storage.from(SUPABASE_BUCKET)
    .createSignedUrl(key, expiresIn, opts.downloadName ? { download: opts.downloadName } : undefined);
  return data?.signedUrl ?? null;
}

export async function getDownloadUrls(keys: string[], expiresIn = 3600): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const urls = await Promise.all(keys.map((k) => getDownloadUrl(k, { expiresIn })));
  keys.forEach((k, i) => { if (urls[i]) out[k] = urls[i]!; });
  return out;
}

export async function deleteObjects(keys: string[]) {
  const list = keys.filter(Boolean);
  if (!list.length) return;
  if (storageDriver() === "r2") {
    for (let i = 0; i < list.length; i += 1000) {
      await r2().send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: list.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }));
    }
    return;
  }
  await createAdminClient().storage.from(SUPABASE_BUCKET).remove(list);
}

// Hapus semua berkas satu proyek (saat proyek atau akun dihapus)
export async function deletePrefix(prefix: string) {
  if (storageDriver() === "r2") {
    let token: string | undefined;
    do {
      const res = await r2().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }));
      await deleteObjects((res.Contents ?? []).map((o) => o.Key!).filter(Boolean));
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return;
  }
  const admin = createAdminClient();
  for (const folder of ["documents", "gifts", "cover"]) {
    const { data } = await admin.storage.from(SUPABASE_BUCKET).list(`${prefix}${folder}`, { limit: 1000 });
    if (data?.length) await admin.storage.from(SUPABASE_BUCKET).remove(data.map((f) => `${prefix}${folder}/${f.name}`));
  }
}

export function isProjectKey(key: string | null | undefined, projectId: string, folder: "documents" | "gifts" | "cover") {
  return !!key && key.startsWith(`${projectId}/${folder}/`) && !key.includes("..");
}
