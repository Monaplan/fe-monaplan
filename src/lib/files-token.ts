import "server-only";
import { createHmac } from "node:crypto";

// Tautan berkas di domain sendiri (Cloudflare Worker, lihat workers/files). Format kanonik harus identik dengan workers/files/index.js.

export const filesWorkerConfigured = () => !!(process.env.FILES_BASE_URL && process.env.FILES_SIGNING_SECRET);

export function canonical(method: string, key: string, exp: number, ct = "", len: number | string = "", name = "") {
  return [method, key, String(exp), ct, String(len), name].join("\n");
}

export function signFileUrl(method: "GET" | "PUT", key: string, opts: { ttl: number; contentType?: string; size?: number; name?: string; now?: number }) {
  const secret = process.env.FILES_SIGNING_SECRET;
  const base = (process.env.FILES_BASE_URL ?? "").replace(/\/$/, "");
  if (!secret || !base) throw new Error("FILES_BASE_URL dan FILES_SIGNING_SECRET belum diisi");
  const exp = Math.floor((opts.now ?? Date.now()) / 1000) + opts.ttl;
  const sig = createHmac("sha256", secret).update(canonical(method, key, exp, opts.contentType ?? "", opts.size ?? "", opts.name ?? "")).digest("base64url");
  const q = new URLSearchParams({ exp: String(exp), sig });
  if (opts.contentType) q.set("ct", opts.contentType);
  if (opts.size != null) q.set("len", String(opts.size));
  if (opts.name) q.set("name", opts.name);
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}?${q}`;
}
