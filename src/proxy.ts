import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { dedicatedHost, routeByHost } from "@/lib/links";
import { appUrl } from "@/lib/constants";

// Domain khusus (opsional): NEXT_PUBLIC_SHORT_URL (mis. https://s.monaplan.id) dan NEXT_PUBLIC_BIO_URL (mis. https://bio.monaplan.id).
// Bila diisi, s.<domain>/<slug> dilayani rute /s/<slug> dan bio.<domain>/ dilayani halaman /bio. Bila kosong, tidak ada yang berubah.
const shortHost = dedicatedHost(process.env.NEXT_PUBLIC_SHORT_URL, appUrl());
const bioHost = dedicatedHost(process.env.NEXT_PUBLIC_BIO_URL, appUrl());

export async function proxy(request: NextRequest) {
  if (shortHost || bioHost) {
    const route = routeByHost(request.headers.get("host") ?? "", request.nextUrl.pathname, { shortHost, bioHost });
    if (route?.kind === "rewrite") {
      const url = request.nextUrl.clone();
      url.pathname = route.path;
      return NextResponse.rewrite(url);
    }
    if (route?.kind === "redirect-main") return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, appUrl()), 307);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|buka\.html|sw\.js|pwa-launch|pwa-icon|api/webhooks|api/rsvp|rsvp|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
