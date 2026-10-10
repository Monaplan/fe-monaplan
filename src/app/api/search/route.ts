import { NextResponse } from "next/server";
import { getAuthUser, getProjectContext } from "@/lib/access";
import { rateLimited } from "@/lib/rate-limit";
import { hitHref, searchProject } from "@/lib/search";
import { projectPath } from "@/lib/paths";
import { getLang } from "@/i18n/server";

export const runtime = "nodejs";

// GET /api/search?p=<slug-atau-id>&q=<kata kunci>. Hanya untuk anggota proyek; RLS tetap berlaku pada semua query.
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  if (rateLimited(`search:${user.id}`, 60)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const url = new URL(request.url);
  const ref = (url.searchParams.get("p") ?? "").slice(0, 80);
  const q = url.searchParams.get("q") ?? "";
  if (!/^[A-Za-z0-9-]{3,80}$/.test(ref)) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  let ctx;
  try { ctx = await getProjectContext(ref); } catch { return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 }); }
  const base = projectPath(ctx.project);
  const result = await searchProject(ctx.supabase, ctx.projectId, q, await getLang());
  return NextResponse.json({
    total: result.total,
    groups: result.groups.map((g) => ({ key: g.key, hits: g.hits.map((h) => ({ id: h.id, title: h.title, sub: h.sub, href: hitHref(base, h) })) })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
