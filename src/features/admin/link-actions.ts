"use server";

import { revalidatePath } from "next/cache";
import { adminContext as ctx } from "./context";
import { bustPublicCache } from "@/lib/ttl-cache";
import { dbError, fail, type ActionResult } from "@/lib/result";
import { BIO_ICONS, buildBioTree, cleanTargetUrl, isValidSlug, moveId, normalizeSlug, randomSlug } from "@/lib/links";
import { getAllBio } from "@/lib/bio-data";

// ---------- Shortlink dan bio link (admin) ----------
const str = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : null);
const MAX_BIO_LINKS = 50;

type Err = { code?: string; message?: string };

function linkDbError(error: Err): ActionResult {
  // 42P01 = tabel belum ada: migrasi tautan belum dijalankan
  if (error.code === "42P01" || /relation .*(short_links|bio_links|link_stats)/i.test(error.message ?? "")) {
    return fail("Tabel tautan belum ada. Jalankan migrasi 20261112000001_links.sql di Supabase SQL Editor.");
  }
  // Kolom atau tabel tahap 2 (section, unggulan, label, deskripsi, ajakan) belum ada
  if (/bio_sections|section_id|is_featured|cta_label|\bbadge\b|\bdescription\b/i.test(error.message ?? "") && /column|schema cache|relation/i.test(error.message ?? "")) {
    return fail("Fitur section dan tampilan bio baru butuh migrasi 20261112000002_bio_sections.sql. Jalankan di Supabase SQL Editor.");
  }
  return dbError(error);
}

function refresh() {
  bustPublicCache();
  revalidatePath("/admin/shortlink");
  revalidatePath("/admin/bio");
  revalidatePath("/bio");
}

// ----- Shortlink -----
function parseExpiry(fd: FormData): { ok: true; value: string | null } | { ok: false; res: ActionResult } {
  const raw = str(fd.get("expires_on"));
  if (!raw) return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || new Date(`${raw}T00:00:00Z`).toISOString().slice(0, 10) !== raw) return { ok: false, res: fail("Tanggal kedaluwarsa tidak valid.") };
  const at = new Date(`${raw}T23:59:59+07:00`);
  if (at.getTime() <= Date.now()) return { ok: false, res: fail("Tanggal kedaluwarsa harus di masa depan.") };
  return { ok: true, value: at.toISOString() };
}

export async function createShortLink(fd: FormData): Promise<ActionResult> {
  const { admin, audit, adminId } = await ctx();
  const slug = normalizeSlug(str(fd.get("slug"))) || randomSlug(6);
  if (!isValidSlug(slug)) return fail("Slug 2 sampai 40 karakter: huruf kecil, angka, dan tanda hubung.");
  const rawTarget = str(fd.get("target_url"));
  const target = cleanTargetUrl(rawTarget);
  if (!target) return fail("Tujuan harus berupa alamat web yang valid (http atau https).");
  const title = str(fd.get("title"));
  if ((title?.length ?? 0) > 120) return fail("Judul maksimal 120 karakter.");
  const exp = parseExpiry(fd);
  if (!exp.ok) return exp.res;
  const { data, error } = await admin.from("short_links").insert({ slug, target_url: target, title, expires_at: exp.value, created_by: adminId }).select("id, slug").single();
  if (error || !data) return error?.code === "23505" ? fail("Slug ini sudah dipakai. Pilih yang lain.") : linkDbError(error ?? {});
  await audit("shortlink.create", "short_link", data.id as string, { slug, target });
  refresh();
  return { ok: true, message: "Shortlink dibuat.", data: { id: data.id, slug: data.slug } };
}

// Slug tidak bisa diubah: QR dan tautan yang sudah tersebar akan putus. Ubah tujuannya saja, atau buat shortlink baru.
export async function updateShortLink(fd: FormData): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const id = str(fd.get("id"));
  if (!id) return fail("Shortlink tidak ditemukan.");
  const target = cleanTargetUrl(str(fd.get("target_url")));
  if (!target) return fail("Tujuan harus berupa alamat web yang valid (http atau https).");
  const title = str(fd.get("title"));
  if ((title?.length ?? 0) > 120) return fail("Judul maksimal 120 karakter.");
  const exp = parseExpiry(fd);
  if (!exp.ok) return exp.res;
  const { data, error } = await admin.from("short_links").update({ target_url: target, title, expires_at: exp.value, updated_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) return linkDbError(error);
  if (!data?.length) return fail("Shortlink tidak ditemukan.");
  await audit("shortlink.update", "short_link", id, { target });
  refresh();
  return { ok: true, message: "Perubahan tersimpan." };
}

export async function toggleShortLink(id: string, active: boolean): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { data, error } = await admin.from("short_links").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) return linkDbError(error);
  if (!data?.length) return fail("Shortlink tidak ditemukan.");
  await audit("shortlink.toggle", "short_link", id, { active });
  refresh();
  return { ok: true, message: active ? "Shortlink diaktifkan." : "Shortlink dinonaktifkan." };
}

export async function deleteShortLink(id: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { data, error } = await admin.from("short_links").delete().eq("id", id).select("id, slug");
  if (error) return linkDbError(error);
  if (!data?.length) return fail("Shortlink tidak ditemukan.");
  await audit("shortlink.delete", "short_link", id, { slug: data[0]!.slug });
  refresh();
  return { ok: true, message: "Shortlink dihapus." };
}

// ----- Bio link -----
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type BioLinkInput = { label: string; url: string; icon: string; description: string | null; badge: string | null; cta_label: string | null; is_featured: boolean; section_id: string | null };

function parseBioLink(fd: FormData): { ok: true; v: BioLinkInput } | { ok: false; res: ActionResult } {
  const bad = (m: string) => ({ ok: false as const, res: fail(m) });
  const label = str(fd.get("label"));
  if (!label) return bad("Teks tombol wajib diisi.");
  if (label.length > 60) return bad("Teks tombol maksimal 60 karakter.");
  const url = cleanTargetUrl(str(fd.get("url")));
  if (!url) return bad("Tujuan harus berupa alamat web yang valid (http atau https).");
  const icon = String(fd.get("icon") ?? "link");
  if (!(BIO_ICONS as readonly string[]).includes(icon)) return bad("Ikon tidak valid.");
  const description = str(fd.get("description")), badge = str(fd.get("badge")), cta = str(fd.get("cta_label"));
  if ((description?.length ?? 0) > 80) return bad("Deskripsi maksimal 80 karakter.");
  if ((badge?.length ?? 0) > 20) return bad("Label maksimal 20 karakter.");
  if ((cta?.length ?? 0) > 24) return bad("Teks tombol ajakan maksimal 24 karakter.");
  const sectionRaw = str(fd.get("section_id"));
  if (sectionRaw && !UUID.test(sectionRaw)) return bad("Section tidak valid.");
  return { ok: true, v: { label, url, icon, description, badge, cta_label: cta, is_featured: fd.get("is_featured") === "on", section_id: sectionRaw } };
}

// Nomor urut berikutnya di akhir sebuah kelompok: di dalam section, atau tingkat atas (tautan tanpa section dan section berbagi satu urutan)
async function nextOrder(admin: Awaited<ReturnType<typeof ctx>>["admin"], sectionId: string | null): Promise<number> {
  const all = await getAllBio();
  if (sectionId) return all.links.filter((l) => l.section_id === sectionId).reduce((m, l) => Math.max(m, l.sort_order), 0) + 1;
  const top = buildBioTree(all.sections, all.links, false);
  return top.reduce((m, n) => Math.max(m, n.type === "link" ? n.link.sort_order : n.section.sort_order), 0) + 1;
}

async function sectionExists(admin: Awaited<ReturnType<typeof ctx>>["admin"], id: string) {
  const { data } = await admin.from("bio_sections").select("id").eq("id", id).maybeSingle();
  return !!data;
}

export async function createBioLink(fd: FormData): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const p = parseBioLink(fd);
  if (!p.ok) return p.res;
  const { count, error: countError } = await admin.from("bio_links").select("*", { count: "exact", head: true });
  if (countError) return linkDbError(countError);
  if ((count ?? 0) >= MAX_BIO_LINKS) return fail("Maksimal 50 tombol di halaman bio.");
  if (p.v.section_id && !(await sectionExists(admin, p.v.section_id))) return fail("Section tidak ditemukan.");
  const sort = await nextOrder(admin, p.v.section_id);
  const { data, error } = await admin.from("bio_links").insert({ ...p.v, sort_order: sort }).select("id").single();
  if (error || !data) return linkDbError(error ?? {});
  await audit("biolink.create", "bio_link", data.id as string, { label: p.v.label });
  refresh();
  return { ok: true, message: "Tombol ditambahkan." };
}

export async function updateBioLink(fd: FormData): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const id = str(fd.get("id"));
  if (!id) return fail("Tombol tidak ditemukan.");
  const p = parseBioLink(fd);
  if (!p.ok) return p.res;
  const { data: cur } = await admin.from("bio_links").select("id, section_id").eq("id", id).maybeSingle();
  if (!cur) return fail("Tombol tidak ditemukan.");
  if (p.v.section_id && !(await sectionExists(admin, p.v.section_id))) return fail("Section tidak ditemukan.");
  // Pindah section: tautan ditaruh di akhir kelompok barunya
  const moved = (cur.section_id ?? null) !== p.v.section_id;
  const patch: Record<string, unknown> = { ...p.v, updated_at: new Date().toISOString() };
  if (moved) patch.sort_order = await nextOrder(admin, p.v.section_id);
  const { error } = await admin.from("bio_links").update(patch).eq("id", id);
  if (error) return linkDbError(error);
  await audit("biolink.update", "bio_link", id, { label: p.v.label, moved });
  refresh();
  return { ok: true, message: "Perubahan tersimpan." };
}

export async function toggleBioLink(id: string, active: boolean): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { data, error } = await admin.from("bio_links").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) return linkDbError(error);
  if (!data?.length) return fail("Tombol tidak ditemukan.");
  await audit("biolink.toggle", "bio_link", id, { active });
  refresh();
  return { ok: true, message: active ? "Tombol ditampilkan." : "Tombol disembunyikan." };
}

export async function deleteBioLink(id: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { data, error } = await admin.from("bio_links").delete().eq("id", id).select("id, label");
  if (error) return linkDbError(error);
  if (!data?.length) return fail("Tombol tidak ditemukan.");
  await audit("biolink.delete", "bio_link", id, { label: data[0]!.label });
  refresh();
  return { ok: true, message: "Tombol dihapus." };
}

// ----- Section -----
function parseSection(fd: FormData): { ok: true; title: string; kind: "normal" | "dropdown" } | { ok: false; res: ActionResult } {
  const title = str(fd.get("title"));
  if (!title) return { ok: false, res: fail("Nama section wajib diisi.") };
  if (title.length > 60) return { ok: false, res: fail("Nama section maksimal 60 karakter.") };
  const kind = String(fd.get("kind") ?? "normal");
  if (kind !== "normal" && kind !== "dropdown") return { ok: false, res: fail("Jenis section tidak valid.") };
  return { ok: true, title, kind };
}

export async function createBioSection(fd: FormData): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const p = parseSection(fd);
  if (!p.ok) return p.res;
  const { count } = await admin.from("bio_sections").select("*", { count: "exact", head: true });
  if ((count ?? 0) >= 20) return fail("Maksimal 20 section.");
  const { data, error } = await admin.from("bio_sections").insert({ title: p.title, kind: p.kind, sort_order: await nextOrder(admin, null) }).select("id").single();
  if (error || !data) return linkDbError(error ?? {});
  await audit("biosection.create", "bio_section", data.id as string, { title: p.title, kind: p.kind });
  refresh();
  return { ok: true, message: "Section dibuat." };
}

export async function updateBioSection(fd: FormData): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const id = str(fd.get("id"));
  if (!id) return fail("Section tidak ditemukan.");
  const p = parseSection(fd);
  if (!p.ok) return p.res;
  const { data, error } = await admin.from("bio_sections").update({ title: p.title, kind: p.kind, updated_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) return linkDbError(error);
  if (!data?.length) return fail("Section tidak ditemukan.");
  await audit("biosection.update", "bio_section", id, { title: p.title, kind: p.kind });
  refresh();
  return { ok: true, message: "Perubahan tersimpan." };
}

export async function toggleBioSection(id: string, active: boolean): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const { data, error } = await admin.from("bio_sections").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) return linkDbError(error);
  if (!data?.length) return fail("Section tidak ditemukan.");
  await audit("biosection.toggle", "bio_section", id, { active });
  refresh();
  return { ok: true, message: active ? "Section ditampilkan." : "Section disembunyikan beserta isinya." };
}

// Section dihapus: tautan di dalamnya dipindah ke tingkat atas (di akhir daftar), tidak ikut terhapus
export async function deleteBioSection(id: string): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  const all = await getAllBio();
  const sec = all.sections.find((x) => x.id === id);
  if (!sec) return fail("Section tidak ditemukan.");
  const children = all.links.filter((l) => l.section_id === id).sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1));
  let next = await nextOrder(admin, null);
  for (const c of children) {
    const { error } = await admin.from("bio_links").update({ section_id: null, sort_order: next++ }).eq("id", c.id);
    if (error) return linkDbError(error);
  }
  const { error } = await admin.from("bio_sections").delete().eq("id", id);
  if (error) return linkDbError(error);
  await audit("biosection.delete", "bio_section", id, { title: sec.title, links: children.length });
  refresh();
  return { ok: true, message: children.length ? "Section dihapus. Tautannya dipindah ke daftar utama." : "Section dihapus." };
}

// ----- Urutan -----
// Geser satu item ke atas atau bawah di antara saudaranya: tautan di dalam section hanya bergeser di sana; tautan tanpa section
// dan section bergeser di tingkat atas. Nomor urut dinomori ulang berurutan, supaya urutan kembar tidak membuat geseran tak berpengaruh.
export async function moveBioItem(kind: "link" | "section", id: string, dir: "up" | "down"): Promise<ActionResult> {
  const { admin, audit } = await ctx();
  if (dir !== "up" && dir !== "down") return fail("Arah tidak valid.");
  const all = await getAllBio();
  const link = kind === "link" ? all.links.find((l) => l.id === id) : undefined;
  if (kind === "link" && !link) return fail("Tombol tidak ditemukan.");
  if (kind === "section" && !all.sections.some((x) => x.id === id)) return fail("Section tidak ditemukan.");

  type Item = { key: string; table: "bio_links" | "bio_sections"; id: string; order: number };
  let items: Item[];
  const inSection = !!(link?.section_id && all.sections.some((x) => x.id === link.section_id));
  if (inSection) {
    items = all.links.filter((l) => l.section_id === link!.section_id).sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1)).map((l) => ({ key: l.id, table: "bio_links", id: l.id, order: l.sort_order }));
  } else {
    items = buildBioTree(all.sections, all.links, false).map((n) => n.type === "link"
      ? { key: n.link.id, table: "bio_links" as const, id: n.link.id, order: n.link.sort_order }
      : { key: n.section.id, table: "bio_sections" as const, id: n.section.id, order: n.section.sort_order });
  }
  const next = moveId(items.map((x) => x.key), id, dir);
  if (!next) return { ok: true };
  const byKey = new Map(items.map((x) => [x.key, x]));
  const changes = next.map((k, i) => ({ item: byKey.get(k)!, order: i + 1 })).filter((c) => c.item.order !== c.order);
  const results = await Promise.all(changes.map((c) => admin.from(c.item.table).update({ sort_order: c.order }).eq("id", c.item.id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return linkDbError(failed.error);
  await audit("bio.move", kind === "link" ? "bio_link" : "bio_section", id, { dir });
  refresh();
  return { ok: true };
}
