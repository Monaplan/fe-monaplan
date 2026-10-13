import { NextResponse } from "next/server";
import { getProjectContext } from "@/lib/access";
import { listArrivedGuests } from "@/lib/checkin";
import { renderTamuHadirPdf } from "@/lib/pdf/tamu-hadir";

export const runtime = "nodejs";

// PDF daftar tamu yang sudah check-in, urut waktu masuk. Otorisasi lewat RLS (anggota ruang kerja saja).
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: ref } = await params;
  const { supabase, project, projectId } = await getProjectContext(ref);

  const guests = await listArrivedGuests(supabase, projectId);
  if (guests === null) return NextResponse.json({ error: "Fitur check-in belum aktif. Jalankan migrasi 20261013000006_guest_checkin.sql." }, { status: 409 });

  const pdf = await renderTamuHadirPdf({
    couple: project.title,
    tz: project.timezone,
    weddingDate: project.wedding_date,
    guests: guests.map((g) => ({
      name: g.name,
      group: g.group,
      side: g.side ?? null,
      pax: g.checked_in_pax ?? g.pax_confirmed ?? g.pax_invited,
      checkedInAt: g.checked_in_at!,
      checkedInBy: g.checked_in_by ?? null,
    })),
  });

  const slug = (project.slug ?? project.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tamu-hadir-${slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
