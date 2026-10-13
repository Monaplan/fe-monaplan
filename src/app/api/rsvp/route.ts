import { NextResponse, after } from "next/server";
import { notifyRsvp } from "@/lib/push";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/codes";
import { rateLimited } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const Body = z.object({
  slug: z.string().min(3).max(60),
  name: z.string().trim().min(2).max(80),
  status: z.enum(["hadir", "tidak_hadir", "ragu"]),
  pax: z.number().int().min(0).max(20),
  message: z.string().max(500).optional().default(""),
  captcha: z.string().max(2048).optional(),
});

const MESSAGES: Record<string, string> = {
  RSVP_NOT_FOUND: "Undangan tidak ditemukan.",
  RSVP_CLOSED: "Konfirmasi kehadiran untuk acara ini sudah ditutup.",
  RSVP_DEADLINE_PASSED: "Batas waktu konfirmasi kehadiran sudah lewat.",
  RSVP_PAX_INVALID: "Jumlah orang melebihi kuota undangan.",
  RSVP_INVALID_STATUS: "Pilih salah satu jawaban dulu, ya.",
  RSVP_NAME_INVALID: "Tulis namamu dulu, ya.",
  RSVP_NAME_AMBIGUOUS: "Ada lebih dari satu tamu dengan nama itu. Tulis nama lengkapmu, ya.",
  RSVP_TOO_MANY: "Terlalu banyak tamu baru hari ini. Hubungi pengantin untuk konfirmasi.",
};

// Undangan publik: tidak ada login, jadi dibatasi per alamat IP dan per undangan
export async function POST(request: Request) {
  if (rateLimited(`rsvp:${clientIp(request.headers) ?? "unknown"}`, 10)) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Terlalu banyak percobaan. Coba lagi sebentar lagi." }, { status: 429 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", message: "Isian belum lengkap." }, { status: 400 });
  const d = parsed.data;
  if (rateLimited(`rsvp-slug:${d.slug}`, 60)) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Undangan ini sedang ramai. Coba lagi sebentar lagi." }, { status: 429 });
  }

  if (!(await verifyTurnstile(d.captcha, clientIp(request.headers)))) {
    return NextResponse.json({ error: "CAPTCHA_FAILED", message: "Verifikasi keamanan belum selesai. Tunggu kotak verifikasi tercentang, lalu coba lagi." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("submit_rsvp_by_name", {
    p_slug: d.slug,
    p_name: d.name,
    p_status: d.status,
    p_pax: d.status === "hadir" ? d.pax : 0,
    p_message: d.message,
  });
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message.includes(k)) ?? "UNKNOWN";
    return NextResponse.json({ error: code, message: MESSAGES[code] ?? "Gagal menyimpan. Coba lagi, ya." }, { status: 400 });
  }

  // Tamu yang hadir mendapat kode QR masuk, dan pemilik serta editor menerima push (bila sudah diaktifkan)
  let checkinCode: string | null = null;
  const { data: project } = await admin.from("wedding_projects").select("id, slug, title").eq("slug", d.slug).maybeSingle();
  if (project) {
    if (d.status === "hadir") {
      // Pencocokan nama memakai aturan yang sama dengan submit_rsvp_by_name (sapaan dan spasi diabaikan)
      const { data: lookup } = await admin.rpc("rsvp_lookup", { p_slug: d.slug, p_name: d.name });
      const guestId = (lookup as { matches?: number; guest?: { id: string } } | null)?.matches === 1 ? (lookup as { guest: { id: string } }).guest.id : null;
      if (guestId) {
        const { data: row } = await admin.from("guests").select("checkin_code").eq("id", guestId).maybeSingle();
        checkinCode = (row as { checkin_code?: string } | null)?.checkin_code ?? null;
      }
    }
    after(() => notifyRsvp(admin, project, d.name, d.status, d.pax));
  }
  return NextResponse.json({ ok: true, checkin_code: checkinCode });
}
