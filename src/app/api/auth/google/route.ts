import { NextResponse } from "next/server";
import { appUrl } from "@/lib/constants";
import { safeNextPath } from "@/lib/paths";
import { signState } from "@/lib/google/crypto";
import { buildLoginUrl, googleOwnLoginEnabled } from "@/lib/google/oauth";

// Mulai masuk dengan Google lewat alur milik aplikasi. "next" ikut dalam state bertanda tangan.
export async function GET(request: Request) {
  if (!googleOwnLoginEnabled()) return NextResponse.redirect(`${appUrl()}/login?error=google`);
  const next = new URL(request.url).searchParams.get("next") ?? "";
  const safe = safeNextPath(next, "");
  return NextResponse.redirect(buildLoginUrl(signState({ u: "login", p: safe })));
}
