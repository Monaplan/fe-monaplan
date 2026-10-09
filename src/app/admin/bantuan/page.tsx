import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { LinkTabs } from "@/components/ui/tabs";
import { TicketRow } from "./ticket-row";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Bantuan masuk") };
}

export default async function AdminHelpPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { t } = await getI18n();
  await requireAdmin();
  const { status } = await searchParams;
  const filter = status === "closed" ? "closed" : "open";
  const { data, error } = await createAdminClient()
    .from("support_tickets")
    .select("*, profiles!support_tickets_user_id_fkey(email, full_name)")
    .eq("status", filter)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <ProductTour id="admin-bantuan" steps={TOURS["admin-bantuan"]!} />
      <PageHeader tour="admin-bantuan" title={t("Bantuan masuk")} description={t("Pertanyaan dari pengguna. Balas lewat email, lalu tandai selesai.")} />
      <LinkTabs className="mb-4" items={[
        { href: "?status=open", label: t("Menunggu"), active: filter === "open" },
        { href: "?status=closed", label: t("Selesai"), active: filter === "closed" },
      ]} />
      <Card tour="admin-bantuan-main" className="p-0 sm:p-0">
        {error && <p className="px-5 py-8 text-center text-[13px] text-danger">{t("Tabel tiket belum ada. Jalankan migrasi 20261009000005 di Supabase.")}</p>}
        {!error && !data?.length && <p className="px-5 py-10 text-center text-[13px] text-neutral-500">{filter === "open" ? t("Tidak ada pertanyaan yang menunggu.") : t("Belum ada tiket selesai.")}</p>}
        {(data ?? []).map((t: any) => <TicketRow key={t.id} ticket={t} />)}
      </Card>
    </>
  );
}
