import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBot } from "@/lib/links";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Klik tombol di halaman /bio: dihitung lalu dialihkan ke tujuan tombol. Yang tidak ditemukan kembali ke /bio.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const back = new URL("/bio", req.url);
  const id = (await params).id;
  if (!UUID.test(id)) return NextResponse.redirect(back, 307);
  const admin = createAdminClient();
  try {
    let target: string | null = null;
    if (req.method === "GET" && !isBot(req.headers.get("user-agent"))) {
      const { data, error } = await admin.rpc("hit_bio_link", { p_id: id });
      if (error) throw error;
      target = (data as string | null) ?? null;
    } else {
      const { data } = await admin.from("bio_links").select("url, is_active").eq("id", id).maybeSingle();
      target = data?.is_active ? (data.url as string) : null;
    }
    if (!target) return NextResponse.redirect(back, 307);
    return NextResponse.redirect(target, { status: 307, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch {
    return NextResponse.redirect(back, 307);
  }
}
