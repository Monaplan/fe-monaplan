import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IDLE_COOKIE, idleCookieClear } from "@/lib/idle";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  res.cookies.set(IDLE_COOKIE, "", idleCookieClear(process.env.NODE_ENV === "production"));
  return res;
}
