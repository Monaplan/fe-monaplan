import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/codes";

const Body = z.object({
  status: z.enum(["hadir", "tidak_hadir", "ragu"]),
  pax: z.number().int().min(0).max(20),
  message: z.string().max(500).optional().default(""),
});

const MESSAGES: Record<string, string> = {
  RSVP_NOT_FOUND: "Undangan tidak ditemukan.",
  RSVP_CLOSED: "Konfirmasi kehadiran untuk acara ini sudah ditutup.",
  RSVP_DEADLINE_PASSED: "Batas waktu konfirmasi kehadiran sudah lewat.",
  RSVP_PAX_INVALID: "Jumlah orang melebihi kuota undangan.",
  RSVP_INVALID_STATUS: "Pilih salah satu jawaban dulu, ya.",
};

// Rate limit sederhana per IP (per instance server)
const hits = new Map<string, number[]>();
function limited(key: string) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(key, list);
  return list.length > 10;
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (limited(clientIp(request.headers) ?? "unknown")) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Terlalu banyak percobaan. Coba lagi sebentar lagi." }, { status: 429 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", message: "Isian belum lengkap." }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.rpc("submit_rsvp", {
    p_token: token,
    p_status: parsed.data.status,
    p_pax: parsed.data.status === "hadir" ? parsed.data.pax : 0,
    p_message: parsed.data.message,
  });
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message.includes(k)) ?? "UNKNOWN";
    return NextResponse.json({ error: code, message: MESSAGES[code] ?? "Gagal menyimpan. Coba lagi, ya." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
