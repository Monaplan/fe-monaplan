import { CircleAlert, Link2, MousePointerClick, ToggleRight } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatCard } from "@/components/ui/card";
import { shortBaseUrl } from "@/lib/constants";
import { linkState } from "@/lib/links";
import { getI18n, getT } from "@/i18n/server";
import { ShortlinkClient, type ShortLinkItem } from "./shortlink-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Shortlink") };
}

export default async function ShortlinkPage() {
  const { t } = await getI18n();
  await requireAdmin();
  const { data, error } = await createAdminClient().from("short_links").select("*").order("created_at", { ascending: false }).limit(1000);
  // 42P01 = tabel belum ada: migrasi tautan belum dijalankan
  const missing = error?.code === "42P01" || /relation .*short_links/i.test(error?.message ?? "");

  const links: ShortLinkItem[] = (data ?? []).map((r: any) => ({
    id: r.id, slug: r.slug, target_url: r.target_url, title: r.title, is_active: r.is_active, expires_at: r.expires_at,
    click_count: Number(r.click_count ?? 0), last_clicked_at: r.last_clicked_at, created_at: r.created_at,
  }));
  const active = links.filter((l) => linkState(l) === "active").length;
  const clicks = links.reduce((n, l) => n + l.click_count, 0);

  return (
    <>
      <PageHeader title={t("Shortlink")} description={t("Buat tautan pendek yang mudah diingat untuk iklan, bio, dan QR. Setiap klik dihitung.")} />

      {missing && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Tabel tautan belum ada di database. Jalankan migrasi 20261112000001_links.sql di Supabase SQL Editor, lalu muat ulang halaman ini.")}
        </p>
      )}

      <div className="stagger mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Link2 />} title={t("Total shortlink")} value={links.length} footer={<span>{t("{n} aktif", { n: active })}</span>} />
        <StatCard icon={<MousePointerClick />} title={t("Total klik")} value={clicks.toLocaleString("id-ID")} footer={<span>{t("Pratinjau dan bot tidak dihitung")}</span>} />
        <StatCard icon={<ToggleRight />} title={t("Perlu perhatian")} value={links.length - active} footer={<span>{t("Nonaktif atau kedaluwarsa")}</span>} />
      </div>

      <ShortlinkClient links={links} base={shortBaseUrl()} disabled={missing} />
    </>
  );
}
