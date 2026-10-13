import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/codes";
import { rateLimited } from "@/lib/rate-limit";

// Isi QR masuk tamu: <domain>/q/<kode>. Bila dipindai kamera biasa, alamat ini membuka undangan tamu tersebut.
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const home = new URL("/", request.url);
  if (!/^[A-Za-z0-9]{6,20}$/.test(code) || rateLimited(`q:${clientIp(request.headers) ?? "unknown"}`, 60)) return NextResponse.redirect(home);
  const admin = createAdminClient();
  const { data: guest } = await admin.from("guests").select("name, project_id").eq("checkin_code", code.toUpperCase()).maybeSingle();
  if (!guest) return NextResponse.redirect(home);
  const { data: project } = await admin.from("wedding_projects").select("slug").eq("id", guest.project_id).maybeSingle();
  if (!project?.slug) return NextResponse.redirect(home);
  const target = new URL(`/${project.slug}`, request.url);
  target.searchParams.set("to", guest.name);
  return NextResponse.redirect(target, { headers: { "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" } });
}
