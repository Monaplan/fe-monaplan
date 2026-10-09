import { NextResponse } from "next/server";
import { appUrl } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { verifyState } from "@/lib/google/crypto";
import { exchangeCode, googleLoginRedirectUri, googleOwnLoginEnabled } from "@/lib/google/oauth";

// Tujuan redirect Google untuk login. id_token ditukar menjadi sesi Supabase lewat signInWithIdToken.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = () => NextResponse.redirect(`${appUrl()}/login?error=google`);
  const state = verifyState(url.searchParams.get("state"));
  const code = url.searchParams.get("code");
  if (!state || state.u !== "login" || !code || !googleOwnLoginEnabled()) return fail();

  try {
    const tokens = await exchangeCode(code, googleLoginRedirectUri());
    if (!tokens.idToken) return fail();
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: tokens.idToken, access_token: tokens.accessToken });
    if (error) return fail();
    return NextResponse.redirect(`${appUrl()}${state.p || "/mulai"}`);
  } catch {
    return fail();
  }
}
