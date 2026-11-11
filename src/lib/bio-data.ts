import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ttl } from "@/lib/ttl-cache";
import { BIO_ICONS, buildBioTree, type BioIcon, type BioLinkItem, type BioNode, type BioSectionItem } from "@/lib/links";

const toLink = (r: any): BioLinkItem => ({
  id: r.id, label: r.label, url: r.url, icon: ((BIO_ICONS as readonly string[]).includes(r.icon) ? r.icon : "link") as BioIcon,
  sort_order: Number(r.sort_order ?? 0), is_active: r.is_active !== false, click_count: Number(r.click_count ?? 0),
  // Kolom tahap 2: bila migrasi 20261112000002 belum dijalankan, nilainya kosong dan halaman tetap bekerja
  section_id: r.section_id ?? null, is_featured: r.is_featured === true, badge: r.badge ?? null, description: r.description ?? null, cta_label: r.cta_label ?? null,
});
const toSection = (r: any): BioSectionItem => ({ id: r.id, title: r.title, kind: r.kind === "dropdown" ? "dropdown" : "normal", sort_order: Number(r.sort_order ?? 0), is_active: r.is_active !== false });

// Susunan halaman publik /bio (tautan aktif saja). Disimpan singkat di memori; admin yang mengubahnya memanggil bustPublicCache().
// Tabel belum ada (migrasi belum dijalankan): kosong, halaman tetap tampil.
export const getPublicBio = (): Promise<BioNode[]> =>
  ttl("bio:tree", 30_000, async () => {
    try {
      const admin = createAdminClient();
      const [links, sections] = await Promise.all([
        admin.from("bio_links").select("*").eq("is_active", true).limit(200),
        admin.from("bio_sections").select("*").eq("is_active", true).limit(100),
      ]);
      if (links.error || !links.data) return [];
      return buildBioTree((sections.data ?? []).map(toSection), links.data.map(toLink), true);
    } catch {
      return [];
    }
  });

// Semua tautan dan section (termasuk yang tersembunyi) untuk halaman admin
export async function getAllBio(): Promise<{ links: BioLinkItem[]; sections: BioSectionItem[]; views: number; missing: boolean; sectionsMissing: boolean }> {
  const admin = createAdminClient();
  const [links, sections, stat] = await Promise.all([
    admin.from("bio_links").select("*").order("sort_order").order("created_at").limit(300),
    admin.from("bio_sections").select("*").order("sort_order").order("created_at").limit(100),
    admin.from("link_stats").select("count").eq("key", "bio:views").maybeSingle(),
  ]);
  return { links: (links.data ?? []).map(toLink), sections: (sections.data ?? []).map(toSection), views: Number(stat.data?.count ?? 0), missing: !!links.error, sectionsMissing: !!sections.error && !links.error };
}
