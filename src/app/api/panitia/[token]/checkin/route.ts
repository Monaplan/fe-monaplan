import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/codes";
import { rateLimited } from "@/lib/rate-limit";
import { projectByStaffToken } from "@/lib/hari-h";
import { checkinByCode, listCheckinGuests, walkInGuest } from "@/lib/checkin";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("code"), code: z.string().min(4).max(300), pax: z.number().int().min(0).max(50).nullable().optional() }),
  z.object({ action: z.literal("walkin"), name: z.string().trim().min(2).max(120), pax: z.number().int().min(1).max(20) }),
]);

const limited = (request: Request, token: string) =>
  rateLimited(`panitia-checkin:${clientIp(request.headers) ?? "unknown"}`, 240) || rateLimited(`panitia-checkin-token:${token}`, 1200);

const BY = "Panitia";

// Daftar tamu untuk pencarian nama di pemindai panitia
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (limited(request, token)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  const admin = createAdminClient();
  const project = await projectByStaffToken(admin, token);
  if (!project) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ guests: await listCheckinGuests(admin, project.id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (limited(request, token)) return NextResponse.json({ error: "RATE_LIMITED", message: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }, { status: 429 });
  const admin = createAdminClient();
  const project = await projectByStaffToken(admin, token);
  if (!project) return NextResponse.json({ error: "NOT_FOUND", message: "Tautan panitia tidak berlaku." }, { status: 404 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", message: "Isian belum lengkap." }, { status: 400 });
  const d = parsed.data;
  const r = d.action === "code"
    ? await checkinByCode(admin, project.id, d.code, d.pax ?? null, BY)
    : await walkInGuest(admin, project.id, d.name, d.pax, BY);
  if (!r.ok) return NextResponse.json({ error: "FAILED", message: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, result: r.result });
}
