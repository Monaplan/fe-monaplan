import Link from "next/link";
import { CalendarDays, Clock, FileText, Gift, Heart, ListChecks, Mail, Palette, Plane, Search, Store, Wallet } from "lucide-react";
import { getProjectContext } from "@/lib/access";
import { Card, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { hitHref, MIN_QUERY, searchProject, type SearchGroupKey } from "@/lib/search";
import { projectPath } from "@/lib/paths";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Cari") };
}

const ICON: Record<SearchGroupKey, React.ReactNode> = {
  tugas: <ListChecks />, vendor: <Store />, tamu: <Mail />, budget: <Wallet />, pembayaran: <Wallet />,
  mahar: <Gift />, dokumen: <FileText />, acara: <Heart />, rundown: <Clock />, agenda: <CalendarDays />, inspirasi: <Palette />, perjalanan: <Plane />,
};
const LABEL: Record<SearchGroupKey, string> = {
  tugas: "Tugas", vendor: "Vendor", tamu: "Tamu", budget: "Budget", pembayaran: "Pembayaran",
  mahar: "Mahar & Seserahan", dokumen: "Dokumen", acara: "Acara", rundown: "Rundown", agenda: "Agenda", inspirasi: "Rona Impian", perjalanan: "Honeymoon Planner",
};

export default async function SearchPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ q?: string }> }) {
  const { t, lang } = await getI18n();
  const { projectId: ref } = await params;
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const { supabase, projectId, project } = await getProjectContext(ref);
  const base = projectPath(project);
  const result = q.length >= MIN_QUERY ? await searchProject(supabase, projectId, q, lang) : null;

  return (
    <>
      <PageHeader title={t("Cari")} description={result ? t("{n} hasil untuk \"{q}\"", { n: result.total, q }) : undefined} />
      <form role="search" className="relative mb-4 max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
        <Input name="q" defaultValue={q} placeholder={t("Cari tugas, vendor, tamu")} className="pl-9" autoFocus aria-label={t("Kata kunci")} />
      </form>
      {q && !result && <p className="text-[13px] text-neutral-500">{t("Ketik minimal 2 huruf.")}</p>}
      {result && result.total === 0 && <Card><p className="py-6 text-center text-[13px] text-neutral-500">{t("Tidak ada hasil untuk \"{q}\".", { q })}</p></Card>}
      {result && result.total > 0 && (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.groups.map((g) => (
            <Card key={g.key}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold [&_svg]:size-4 [&_svg]:text-plum-600">{ICON[g.key]}{t(LABEL[g.key])}<span className="tabular ml-auto text-xs font-normal text-neutral-500">{g.hits.length}</span></h2>
              <ul className="divide-y divide-neutral-200">
                {g.hits.map((h) => (
                  <li key={h.id}>
                    <Link href={hitHref(base, h)} className="block py-2 text-sm hover:text-plum-700">
                      <span className="block truncate font-medium">{h.title}</span>
                      {h.sub && <span className="block truncate text-xs text-neutral-500">{h.sub}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
