import Link from "next/link";
import { ListChecks, Mail, Search, Store } from "lucide-react";
import { getProjectContext } from "@/lib/access";
import { Card, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";

export const metadata = { title: "Cari" };

export default async function SearchPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ q?: string }> }) {
  const { projectId } = await params;
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const { supabase } = await getProjectContext(projectId);
  const like = `%${q.replace(/[%_,()]/g, " ")}%`;

  const [tasks, vendors, guests] = q
    ? await Promise.all([
        supabase.from("tasks").select("id, title, status").eq("project_id", projectId).ilike("title", like).limit(10),
        supabase.from("vendors").select("id, name, category").eq("project_id", projectId).ilike("name", like).limit(10),
        supabase.from("guests").select("id, name, rsvp_status").eq("project_id", projectId).ilike("name", like).limit(10),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const groups = [
    { title: "Tugas", icon: <ListChecks />, rows: (tasks.data ?? []).map((t: any) => ({ id: t.id, label: t.title, href: `/w/${projectId}/checklist` })) },
    { title: "Vendor", icon: <Store />, rows: (vendors.data ?? []).map((v: any) => ({ id: v.id, label: `${v.name} · ${v.category}`, href: `/w/${projectId}/vendor/${v.id}` })) },
    { title: "Tamu", icon: <Mail />, rows: (guests.data ?? []).map((g: any) => ({ id: g.id, label: g.name, href: `/w/${projectId}/tamu` })) },
  ];

  return (
    <>
      <PageHeader title="Cari" />
      <form className="relative mb-4 max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
        <Input name="q" defaultValue={q} placeholder="Cari tugas, vendor, tamu" className="pl-9" autoFocus aria-label="Kata kunci" />
      </form>
      {q && (
        <div className="grid gap-4 md:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.title}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold [&_svg]:size-4 [&_svg]:text-plum-600">{g.icon}{g.title}</h2>
              {g.rows.length === 0 ? <p className="text-[13px] text-neutral-500">Tidak ditemukan.</p> : (
                <ul className="divide-y divide-neutral-200">
                  {g.rows.map((r) => <li key={r.id}><Link href={r.href} className="block py-2 text-sm hover:text-plum-700">{r.label}</Link></li>)}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
