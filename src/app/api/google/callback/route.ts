import { NextResponse } from "next/server";
import { appUrl } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken, verifyState } from "@/lib/google/crypto";
import { CALENDAR_SCOPE, exchangeCode, googleConfigured } from "@/lib/google/oauth";
import { syncProject } from "@/lib/google/sync";

// Tujuan redirect Google. State harus sah, belum kedaluwarsa, dan milik pengguna yang sedang masuk.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = verifyState(url.searchParams.get("state"));
  if (!state || !googleConfigured()) return NextResponse.redirect(`${appUrl()}/mulai`);
  const back = (flag: string) => NextResponse.redirect(`${appUrl()}/w/${state.p}/kalender?google=${flag}`);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== state.u) return NextResponse.redirect(`${appUrl()}/login`);

  const code = url.searchParams.get("code");
  if (url.searchParams.get("error") || !code) return back("denied");

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.scope.split(" ").includes(CALENDAR_SCOPE)) return back("scope");
    if (!tokens.refreshToken) return back("norefresh");

    const admin = createAdminClient();
    const { data: member } = await admin.from("project_members").select("user_id").eq("project_id", state.p).eq("user_id", state.u).maybeSingle();
    if (!member) return NextResponse.redirect(`${appUrl()}/mulai`);

    const { error } = await admin.from("google_calendar_links").upsert(
      { user_id: state.u, google_email: tokens.email, refresh_token_enc: encryptToken(tokens.refreshToken), connected_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (error) return back("error");
    await admin.from("google_calendar_syncs").upsert({ user_id: state.u, project_id: state.p }, { onConflict: "user_id,project_id", ignoreDuplicates: true });

    const result = await syncProject(state.u, state.p);
    return back(result.ok && result.failed === 0 ? "ok" : "partial");
  } catch {
    return back("error");
  }
}
