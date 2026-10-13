import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { IDLE_COOKIE, SB_COOKIE_RE, evaluateIdle, idleCookieClear, idleCookieOptions } from "@/lib/idle";

const PROTECTED = ["/app", "/w", "/akun", "/aktivasi", "/admin", "/onboarding", "/checkout", "/gabung", "/mulai", "/reset-password"];

export async function updateSession(request: NextRequest) {
  // Halaman publik (landing, privasi, SEO) tidak butuh sesi, jadi tidak menyentuh Supabase sama sekali
  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  if (!needsAuth && !path.startsWith("/auth")) return NextResponse.next({ request });
  // Layout ruang kerja memakai ini untuk mengalihkan alamat lama ke slug dengan sisa path yang sama
  request.headers.set("x-pathname", path + request.nextUrl.search);

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const secure = process.env.NODE_ENV === "production";
  if (!claims && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(url);
    if (request.cookies.has(IDLE_COOKIE)) redirect.cookies.set(IDLE_COOKIE, "", idleCookieClear(secure));
    return redirect;
  }
  if (!claims) {
    // Tanpa sesi (mis. /auth/*): buang penanda lama supaya tidak terbawa ke login berikutnya
    if (request.cookies.has(IDLE_COOKIE)) response.cookies.set(IDLE_COOKIE, "", idleCookieClear(secure));
    return response;
  }

  // Batas tidak aktif 7 hari (lib/idle.ts). Hanya untuk halaman terlindungi; prefetch tidak memperpanjang sesi.
  if (needsAuth) {
    const prefetch = request.headers.has("next-router-prefetch") || request.headers.get("purpose") === "prefetch" || request.headers.get("sec-purpose")?.includes("prefetch");
    const sessionKey = String((claims as { session_id?: string }).session_id ?? claims.sub ?? "");
    const idle = evaluateIdle({ cookie: request.cookies.get(IDLE_COOKIE)?.value, sessionKey, now: Date.now() });
    if (idle.action === "expire") {
      await supabase.auth.signOut({ scope: "local" });
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?expired=1&next=${encodeURIComponent(path + request.nextUrl.search)}`;
      const redirect = NextResponse.redirect(url);
      // Bawa penghapusan cookie sesi yang ditulis signOut, lalu pastikan semua cookie sb-* terhapus walau terpecah
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      request.cookies.getAll().forEach((c) => { if (SB_COOKIE_RE.test(c.name)) redirect.cookies.set(c.name, "", { path: "/", maxAge: 0 }); });
      redirect.cookies.set(IDLE_COOKIE, "", idleCookieClear(secure));
      return redirect;
    }
    if (!prefetch && (idle.action === "init" || idle.action === "touch")) response.cookies.set(IDLE_COOKIE, idle.value, idleCookieOptions(secure));
  }

  return response;
}
