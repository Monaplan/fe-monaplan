import { NextResponse } from "next/server";
import { getProjectContext } from "@/lib/access";
import { renderRundownPdf } from "@/lib/pdf/rundown";

export const runtime = "nodejs";

// PDF rundown formal. ?acara=<id> untuk satu acara, tanpa parameter atau "semua" untuk seluruh acara (satu halaman per acara).
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: ref } = await params;
  const acara = new URL(request.url).searchParams.get("acara");
  const { supabase, project, projectId } = await getProjectContext(ref);

  const [{ data: events }, { data: items }] = await Promise.all([
    supabase.from("wedding_events").select("id, name, starts_at, venue_name").eq("project_id", projectId).order("sort_order").order("starts_at"),
    supabase.from("rundown_items").select("event_id, start_time, end_time, title, description, pic_name, location, vendors(name)").eq("project_id", projectId).order("start_time").order("sort_order"),
  ]);
  const chosen = acara && acara !== "semua" ? (events ?? []).filter((e) => e.id === acara) : (events ?? []);
  if (!chosen.length) return NextResponse.json({ error: "Acara tidak ditemukan" }, { status: 404 });

  const pdf = await renderRundownPdf({
    couple: project.title,
    tz: project.timezone,
    sections: chosen.map((e) => ({
      eventName: e.name,
      startsAt: e.starts_at,
      venue: e.venue_name,
      items: (items ?? []).filter((i) => i.event_id === e.id).map((i: any) => ({
        start_time: i.start_time, end_time: i.end_time, title: i.title, description: i.description,
        pic_name: i.pic_name, location: i.location, vendor: i.vendors?.name ?? null,
      })),
    })),
  });

  const slug = (project.slug ?? project.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const part = chosen.length === 1 ? chosen[0]!.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "semua-acara";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rundown-${slug}-${part}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
