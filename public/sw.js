// Service worker Monaplan (PRD 21.5): sengaja kecil.
// - Aset /_next/static/* (nama berkas memuat hash) diambil dari cache dulu.
// - Navigasi yang gagal karena offline menampilkan /offline. Halaman ruang kerja TIDAK disimpan di cache
//   agar data pribadi tidak tertinggal di perangkat dan tidak basi.
// - Menerima push dan membuka halaman terkait saat notifikasi diketuk.
const STATIC = "mp-static-v1";
const OFFLINE = "mp-offline-v2";
const OFFLINE_URL = "/offline";
const LAUNCH_URL = "/buka.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE).then((c) => c.addAll([new Request(OFFLINE_URL, { cache: "reload" }), new Request(LAUNCH_URL, { cache: "reload" })])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC, OFFLINE]);
    for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone()).then(() => trim(cache)).catch(() => {});
      return res;
    })());
    return;
  }

  // Halaman pembuka PWA: versi terbaru dari jaringan (berkas statis di CDN, cepat), cache bila lambat lebih dari 1,5 detik atau offline
  if (req.mode === "navigate" && url.pathname === LAUNCH_URL) {
    event.respondWith((async () => {
      const cache = await caches.open(OFFLINE);
      const net = fetch(req).then((res) => { if (res.ok) cache.put(LAUNCH_URL, res.clone()); return res; });
      const slow = new Promise((resolve) => setTimeout(resolve, 1500)).then(() => cache.match(LAUNCH_URL));
      try {
        const first = await Promise.race([net, slow]);
        if (first) return first;
        return await net;
      } catch {
        return (await cache.match(LAUNCH_URL)) || (await caches.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()));
  }
});

// Batasi isi cache aset: berkas dari rilis lama ikut terbuang
async function trim(cache, max = 250) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "Monaplan", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Monaplan";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    icon: "/pwa-icon/192",
    badge: "/pwa-icon/badge-96",
    tag: data.tag || undefined,
    data: { url: data.url || "/mulai" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/mulai", self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (c.url === target && "focus" in c) return c.focus();
    }
    const same = all.find((c) => new URL(c.url).origin === self.location.origin);
    if (same && "navigate" in same) { await same.navigate(target); return same.focus(); }
    return self.clients.openWindow(target);
  })());
});
