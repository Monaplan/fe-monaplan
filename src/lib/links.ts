// Shortlink dan bio link. Fungsi murni (tanpa akses database) supaya mudah diuji dan dipakai di server maupun klien.

export const SLUG_MIN = 2;
export const SLUG_MAX = 40;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Huruf kecil, angka, dan tanda hubung. Spasi dan garis bawah menjadi tanda hubung; karakter lain dibuang.
export function normalizeSlug(raw: string | null | undefined): string {
  return (raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export const isValidSlug = (s: string) => s.length >= SLUG_MIN && s.length <= SLUG_MAX && SLUG_PATTERN.test(s);

// Slug acak yang mudah diketik: tanpa huruf dan angka yang mirip (0/o, 1/l/i)
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function randomSlug(length = 6): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

// Tujuan tautan: hanya http atau https. Tanpa skema (mis. "wa.me/628…") dilengkapi https://. Selain itu null.
export function cleanTargetUrl(raw: string | null | undefined): string | null {
  let v = (raw ?? "").trim();
  if (!v || v.length > 2000 || /[\s\u0000-\u001f\u007f]/.test(v)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Pratinjau tautan (WhatsApp, Telegram, Facebook, mesin pencari) dan alat pemantau ikut membuka tautan; itu bukan klik manusia
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|embedly|quora link|skype|vkshare|pinterest|headless|lighthouse|curl|wget|python-requests|node-fetch|axios/i;
export const isBot = (ua: string | null | undefined) => !ua || BOT_RE.test(ua);

export type LinkState = "active" | "inactive" | "expired";
export function linkState(l: { is_active: boolean; expires_at: string | null }, now = Date.now()): LinkState {
  if (!l.is_active) return "inactive";
  if (l.expires_at && Date.parse(l.expires_at) <= now) return "expired";
  return "active";
}

// base: alamat dasar shortlink, mis. "https://s.monaplan.id" (domain khusus) atau "https://situs.id/s" (satu domain)
export const shortUrl = (base: string, slug: string) => `${base.replace(/\/$/, "")}/${slug}`;

// ---------- Domain khusus (shortlink di s.monaplan.id, bio di bio.monaplan.id) ----------
// Host dari sebuah alamat bila alamat itu domain tersendiri (tanpa path) dan berbeda dari situs utama; selain itu null,
// artinya fitur tetap lewat satu domain (/s/<slug> dan /bio).
export function dedicatedHost(url: string | null | undefined, appUrl: string): string | null {
  try {
    if (!url?.trim()) return null;
    const u = new URL(url.trim());
    if ((u.pathname !== "/" && u.pathname !== "") || u.search || u.hash) return null;
    const app = new URL(appUrl);
    return u.host.toLowerCase() === app.host.toLowerCase() ? null : u.host.toLowerCase();
  } catch {
    return null;
  }
}

export type HostRoute = { kind: "rewrite"; path: string } | { kind: "redirect-main" } | null;

// Halaman dan berkas yang boleh dilayani di domain bio; sisanya dialihkan ke situs utama
const BIO_HOST_OK = /^\/(bio|b\/[^/]+|icon|apple-icon|manifest\.webmanifest|opengraph-image|robots\.txt|sitemap\.xml|_next\/.*)?$/;

// Menentukan perlakuan sebuah permintaan menurut host-nya. null = layani seperti biasa.
export function routeByHost(host: string, pathname: string, cfg: { shortHost: string | null; bioHost: string | null }): HostRoute {
  const h = host.toLowerCase();
  if (cfg.shortHost && h === cfg.shortHost) {
    if (pathname === "/" || pathname === "") return { kind: "redirect-main" };
    if (pathname.startsWith("/s/") || pathname.startsWith("/_next/") || pathname === "/robots.txt") return null;
    // /<slug> dilayani oleh rute /s/<slug>; hanya segmen pertama yang dipakai
    return { kind: "rewrite", path: `/s/${pathname.split("/")[1]}` };
  }
  if (cfg.bioHost && h === cfg.bioHost) {
    if (pathname === "/" || pathname === "") return { kind: "rewrite", path: "/bio" };
    return BIO_HOST_OK.test(pathname) ? null : { kind: "redirect-main" };
  }
  return null;
}

// Ikon tombol bio link (nama dirujuk dari konfigurasi; gambarnya ada di komponen tampilan)
export const BIO_ICONS = ["link", "shop", "whatsapp", "instagram", "mail", "globe", "gift", "calendar", "phone", "video", "file"] as const;
export type BioIcon = (typeof BIO_ICONS)[number];
export const BIO_ICON_LABEL: Record<BioIcon, string> = { link: "Tautan", shop: "Toko", whatsapp: "WhatsApp", instagram: "Instagram", mail: "Email", globe: "Situs web", gift: "Hadiah", calendar: "Kalender", phone: "Telepon", video: "Video", file: "Dokumen" };

export type BioLinkItem = {
  id: string; label: string; url: string; icon: BioIcon; sort_order: number; is_active: boolean; click_count: number;
  section_id: string | null; is_featured: boolean; badge: string | null; description: string | null; cta_label: string | null;
};
export type BioSectionKind = "normal" | "dropdown";
export type BioSectionItem = { id: string; title: string; kind: BioSectionKind; sort_order: number; is_active: boolean };
export const BIO_SECTION_KIND_LABEL: Record<BioSectionKind, string> = { normal: "Biasa", dropdown: "Dropdown (bisa dilipat)" };

export type BioNode = { type: "link"; link: BioLinkItem } | { type: "section"; section: BioSectionItem; links: BioLinkItem[] };

// Susun tampilan halaman bio: tautan tanpa section dan section berbagi satu urutan di tingkat atas; tautan di dalam
// section berurutan di dalamnya. onlyActive (halaman publik): yang disembunyikan dibuang, termasuk seluruh isi section yang disembunyikan.
// Tautan yang section-nya sudah tidak ada dianggap tanpa section.
export function buildBioTree(sections: BioSectionItem[], links: BioLinkItem[], onlyActive = false): BioNode[] {
  const secs = onlyActive ? sections.filter((x) => x.is_active) : sections;
  const known = new Set(sections.map((x) => x.id));
  const byOrder = <T extends { sort_order: number; id: string }>(a: T, b: T) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1);
  const usable = (l: BioLinkItem) => !onlyActive || l.is_active;
  const top: { order: number; id: string; node: BioNode }[] = [];
  for (const l of links) {
    const inSection = l.section_id && known.has(l.section_id);
    if (inSection || !usable(l)) continue;
    top.push({ order: l.sort_order, id: l.id, node: { type: "link", link: l } });
  }
  for (const sec of secs) {
    const children = links.filter((l) => l.section_id === sec.id && usable(l)).sort(byOrder);
    top.push({ order: sec.sort_order, id: sec.id, node: { type: "section", section: sec, links: children } });
  }
  return top.sort((a, b) => a.order - b.order || (a.node.type === b.node.type ? (a.id < b.id ? -1 : 1) : a.node.type === "link" ? -1 : 1)).map((x) => x.node);
}

// Tukar urutan dua tautan bertetangga; mengembalikan urutan id baru, atau null bila sudah di ujung
export function moveId(ids: string[], id: string, dir: "up" | "down"): string[] | null {
  const i = ids.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const next = [...ids];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}
