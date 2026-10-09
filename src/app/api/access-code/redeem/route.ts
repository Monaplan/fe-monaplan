import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, maskCode } from "@/lib/codes";
import { CODE_ERROR_MESSAGES } from "@/lib/constants";
import { formatDateCompact } from "@/lib/format";

const Body = z.object({ code: z.string().min(1).max(40) });
const WINDOW_MIN = 15;
const MAX_FAILED = 5;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "CODE_INVALID_FORMAT", message: CODE_ERROR_MESSAGES.CODE_INVALID_FORMAT }, { status: 400 });
  }

  const admin = createAdminClient();
  const ip = clientIp(request.headers);
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();

  // Batas 5 percobaan gagal per user dan per IP dalam 15 menit
  const failedBy = async (col: "user_id" | "ip_address", val: string) => {
    const { data } = await admin
      .from("access_code_attempts")
      .select("attempted_at")
      .eq(col, val)
      .eq("success", false)
      .gte("attempted_at", since)
      .order("attempted_at", { ascending: true });
    return data ?? [];
  };
  const [byUser, byIp] = await Promise.all([failedBy("user_id", auth.user.id), ip ? failedBy("ip_address", ip) : Promise.resolve([])]);
  const blocking = byUser.length >= MAX_FAILED ? byUser : byIp.length >= MAX_FAILED ? byIp : null;
  if (blocking) {
    const oldest = Date.parse(blocking[blocking.length - MAX_FAILED]!.attempted_at);
    const minutes = Math.max(1, Math.ceil((oldest + WINDOW_MIN * 60_000 - Date.now()) / 60_000));
    return NextResponse.json(
      { error: "RATE_LIMITED", message: CODE_ERROR_MESSAGES.RATE_LIMITED.replace("{menit}", String(minutes)) },
      { status: 429 },
    );
  }

  const { data: license, error } = await supabase.rpc("redeem_access_code", { p_code: parsed.data.code });

  const reason = error ? (Object.keys(CODE_ERROR_MESSAGES).find((k) => error.message.includes(k)) ?? "UNKNOWN") : null;
  await admin.from("access_code_attempts").insert({
    user_id: auth.user.id,
    ip_address: ip,
    code_masked: maskCode(parsed.data.code),
    success: !error,
    failure_reason: reason,
  });

  if (error) {
    return NextResponse.json(
      { error: reason, message: CODE_ERROR_MESSAGES[reason!] ?? "Kode belum bisa dipakai. Coba lagi, ya." },
      { status: 400 },
    );
  }

  const lic = license as { ends_at: string | null; starts_at: string };
  const message = lic.ends_at ? `Akses aktif sampai ${formatDateCompact(lic.ends_at)}.` : "Akses selamanya sudah aktif. Selamat merencanakan!";
  return NextResponse.json({ ok: true, message, endsAt: lic.ends_at });
}
