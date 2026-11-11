import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBot, isValidSlug, linkState, normalizeSlug } from "@/lib/links";

// Shortlink: /s/<slug> mengalihkan (307, sementara) ke tujuan dan menghitung klik. Tautan yang tidak ada, nonaktif,
// atau kedaluwarsa mengalihkan ke beranda. Pratinjau tautan dan bot tetap dialihkan tetapi tidak dihitung.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const home = new URL("/", req.url);
  const slug = normalizeSlug((await params).slug);
  if (!isValidSlug(slug)) return NextResponse.redirect(home, 307);
  const admin = createAdminClient();
  try {
    let target: string | null = null;
    if (req.method === "GET" && !isBot(req.headers.get("user-agent"))) {
      const { data, error } = await admin.rpc("hit_short_link", { p_slug: slug });
      if (error) throw error;
      target = (data as string | null) ?? null;
    } else {
      const { data } = await admin.from("short_links").select("target_url, is_active, expires_at").eq("slug", slug).maybeSingle();
      target = data && linkState(data as { is_active: boolean; expires_at: string | null }) === "active" ? (data.target_url as string) : null;
    }
    if (!target) return NextResponse.redirect(home, 307);
    return NextResponse.redirect(target, { status: 307, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch {
    return NextResponse.redirect(home, 307);
  }
}
