// Cloudflare Worker untuk berkas Monaplan: files.domainmu.com
// Bucket R2 tetap privat. Worker hanya melayani GET dan PUT yang membawa tanda tangan HMAC buatan server aplikasi
// (FILES_SIGNING_SECRET yang sama di kedua sisi), berumur pendek, dan terikat pada kunci, tipe, serta ukuran berkas.
//
// URL:  https://files.domainmu.com/{kunci-objek}?exp=<unix>&sig=<hmac>[&ct=<tipe>&len=<byte>][&name=<nama-unduhan>]

const enc = new TextEncoder();

// Harus identik dengan penandatangan di aplikasi (src/lib/files-token.ts)
export function canonical(method, key, exp, ct = "", len = "", name = "") {
  return [method, key, String(exp), ct, String(len), name].join("\n");
}

function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function verify(secret, method, key, params, now = Date.now()) {
  const exp = Number(params.get("exp"));
  const sig = params.get("sig");
  if (!sig || !Number.isFinite(exp) || exp * 1000 < now) return false;
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const data = enc.encode(canonical(method, key, exp, params.get("ct") ?? "", params.get("len") ?? "", params.get("name") ?? ""));
  try {
    return await crypto.subtle.verify("HMAC", k, b64urlToBytes(sig), data);
  } catch {
    return false;
  }
}

function cors(env, request) {
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  const origin = request.headers.get("Origin");
  const headers = { Vary: "Origin" };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, PUT, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}

const text = (status, body, extra = {}) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...extra } });

export default {
  async fetch(request, env) {
    const headers = cors(env, request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "GET" && request.method !== "PUT") return text(405, "Method not allowed", headers);
    if (!env.FILES_SIGNING_SECRET) return text(500, "Not configured", headers);

    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.slice(1));
    if (!key || key.includes("..") || key.startsWith("/")) return text(400, "Bad key", headers);
    if (!(await verify(env.FILES_SIGNING_SECRET, request.method, key, url.searchParams))) return text(403, "Invalid or expired link", headers);

    if (request.method === "PUT") {
      const ct = url.searchParams.get("ct") ?? "";
      const len = Number(url.searchParams.get("len"));
      // Tipe dan ukuran yang ditandatangani server harus sama dengan isi unggahan
      if (request.headers.get("Content-Type") !== ct) return text(400, "Content-Type mismatch", headers);
      if (Number(request.headers.get("Content-Length")) !== len) return text(400, "Content-Length mismatch", headers);
      await env.BUCKET.put(key, request.body, { httpMetadata: { contentType: ct } });
      return text(200, "OK", headers);
    }

    const obj = await env.BUCKET.get(key);
    if (!obj) return text(404, "Not found", headers);
    const name = url.searchParams.get("name");
    return new Response(obj.body, {
      headers: {
        ...headers,
        "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
        "Content-Length": String(obj.size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...(name ? { "Content-Disposition": `attachment; filename="${name.replace(/["\\\r\n]/g, "")}"` } : {}),
      },
    });
  },
};
