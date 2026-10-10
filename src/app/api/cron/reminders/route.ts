import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { runReminders } from "@/lib/reminders";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "") || request.headers.get("x-cron-secret") || "";
  return given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

// Dipanggil penjadwal (pg_cron + pg_net, atau Cloudflare Cron) tiap 15 menit.
// Tanpa CRON_SECRET endpoint menolak semua permintaan, supaya tidak pernah terbuka untuk umum.
async function handle(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET belum diisi" }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const admin = createAdminClient();
    const reminders = await runReminders(admin);
    return NextResponse.json({ ok: true, ...reminders });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
