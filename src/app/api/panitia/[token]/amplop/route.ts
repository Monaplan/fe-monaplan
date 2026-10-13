import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/codes";
import { rateLimited } from "@/lib/rate-limit";
import { projectByStaffToken } from "@/lib/hari-h";

const Body = z.object({
  giver_name: z.string().trim().min(1).max(120),
  kind: z.enum(["amplop", "transfer", "kado"]),
  side: z.enum(["pria", "wanita", "bersama"]).default("bersama"),
  amount_idr: z.number().int().min(0).max(10_000_000_000).nullable().optional(),
  item_name: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

// Panitia mencatat amplop lewat tautan panitia, hanya bila pemilik mengizinkannya
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (rateLimited(`panitia-amplop:${clientIp(request.headers) ?? "unknown"}`, 60) || rateLimited(`panitia-amplop-token:${token}`, 300)) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }, { status: 429 });
  }
  const admin = createAdminClient();
  const project = await projectByStaffToken(admin, token);
  if (!project) return NextResponse.json({ error: "NOT_FOUND", message: "Tautan panitia tidak berlaku." }, { status: 404 });
  if (!project.staff_can_record_gifts) return NextResponse.json({ error: "FORBIDDEN", message: "Pemilik belum mengizinkan panitia mencatat amplop." }, { status: 403 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", message: "Isian belum lengkap." }, { status: 400 });
  const d = parsed.data;
  if (d.kind === "kado" ? !d.item_name : d.amount_idr == null) {
    return NextResponse.json({ error: "INVALID_INPUT", message: d.kind === "kado" ? "Isi nama barang kadonya." : "Isi nominalnya." }, { status: 400 });
  }

  // Nama yang persis sama dengan tamu terdaftar dihubungkan ke tamu itu
  const { data: guest } = await admin.from("guests").select("id").eq("project_id", project.id).ilike("name", d.giver_name.replace(/[%_\\]/g, (c) => `\\${c}`)).limit(2);
  const { error } = await admin.from("gift_receipts").insert({
    project_id: project.id,
    guest_id: guest?.length === 1 ? guest[0]!.id : null,
    giver_name: d.giver_name,
    side: d.side,
    kind: d.kind,
    amount_idr: d.kind === "kado" ? d.amount_idr ?? null : d.amount_idr,
    item_name: d.kind === "kado" ? d.item_name : null,
    notes: d.notes || null,
    recorded_via: "panitia",
  });
  if (error) return NextResponse.json({ error: "DB", message: "Gagal menyimpan. Coba lagi, ya." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
