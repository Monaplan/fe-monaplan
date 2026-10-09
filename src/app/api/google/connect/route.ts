import { NextResponse } from "next/server";
import { appUrl } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { signState } from "@/lib/google/crypto";
import { buildAuthUrl, googleConfigured } from "@/lib/google/oauth";

// Mulai persetujuan Google untuk menyinkronkan satu proyek. Hanya anggota proyek yang boleh.
export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("project") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return NextResponse.redirect(`${appUrl()}/mulai`);
  const back = (flag: string) => NextResponse.redirect(`${appUrl()}/w/${projectId}/kalender?google=${flag}`);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(`${appUrl()}/login?next=${encodeURIComponent(`/w/${projectId}/kalender`)}`);

  const { data: member } = await supabase.from("project_members").select("user_id").eq("project_id", projectId).eq("user_id", auth.user.id).maybeSingle();
  if (!member) return NextResponse.redirect(`${appUrl()}/mulai`);
  if (!googleConfigured()) return back("not_configured");

  return NextResponse.redirect(buildAuthUrl(signState({ u: auth.user.id, p: projectId }), auth.user.email ?? undefined));
}
