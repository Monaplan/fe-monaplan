// Uji fungsi murni: harga promo dan pemetaan event Google Calendar.
// TypeScript-nya ditranspilasi sementara ke folder temp, tanpa dependensi tambahan. Jalankan: npm run test:lib
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), "mp-lib-"));

for (const rel of ["src/lib/pricing.ts", "src/lib/constants.ts", "src/lib/format.ts", "src/lib/google/events.ts", "src/lib/google/crypto.ts", "src/lib/email/templates.ts", "src/lib/files-token.ts"]) {
  // "server-only" hanya berlaku di bundel Next, jadi dilepas untuk uji ini
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8").replace('import "server-only";', "");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/from "(\.{1,2}\/[^"]+)"/g, 'from "$1.mjs"');
  const dest = path.join(OUT, rel.replace(/\.ts$/, ".mjs"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, js);
}
const load = (rel) => import(pathToFileURL(path.join(OUT, rel)).href);
const { priceFor, discountOf, promoIsLive, MIN_CHARGE_IDR, upgradeQuote, creditOf } = await load("src/lib/pricing.mjs");
const { buildDesiredEvents, eventIdFor, planSync } = await load("src/lib/google/events.mjs");
process.env.TOKEN_ENCRYPTION_KEY = "kunci-uji";
const { encryptToken, decryptToken, signState, verifyState } = await load("src/lib/google/crypto.mjs");

let pass = 0, bad = 0;
const check = (name, cond, extra = "") => { if (cond) { pass++; console.log("  PASS", name); } else { bad++; console.log("  FAIL", name, extra); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log("Harga promo");
const plan = { id: "P1", price_idr: 199000 };
const mk = (o) => ({ id: "x", name: "Promo", description: null, plan_id: null, discount_type: "percent", discount_value: 20, starts_at: null, ends_at: null, is_active: true, ...o });
check("tanpa promo: harga normal", eq(priceFor(plan, [], true), { original: 199000, discount: 0, final: 199000, promo: null }));
check("persen 20%", priceFor(plan, [mk({})], true).final === 159200);
check("nominal Rp 50.000", priceFor(plan, [mk({ discount_type: "fixed", discount_value: 50000 })], true).final === 149000);
check("saklar promo mati", priceFor(plan, [mk({})], false).final === 199000);
check("promo belum mulai diabaikan", priceFor(plan, [mk({ starts_at: new Date(Date.now() + 86_400_000).toISOString() })], true).discount === 0);
check("promo kedaluwarsa diabaikan", priceFor(plan, [mk({ ends_at: new Date(Date.now() - 1000).toISOString() })], true).discount === 0);
check("promo nonaktif diabaikan", priceFor(plan, [mk({ is_active: false })], true).discount === 0);
check("promo paket lain diabaikan", priceFor(plan, [mk({ plan_id: "P2" })], true).discount === 0);
check("promo paket yang sama dipakai", priceFor(plan, [mk({ plan_id: "P1" })], true).discount === 39800);
check("pilih potongan terbesar", priceFor(plan, [mk({ id: "a", discount_value: 10 }), mk({ id: "b", discount_type: "fixed", discount_value: 60000 })], true).promo?.id === "b");
check("harga tidak di bawah batas minimum", priceFor(plan, [mk({ discount_type: "fixed", discount_value: 500000 })], true).final === MIN_CHARGE_IDR);
check("persen 100% tetap menyisakan batas minimum", priceFor(plan, [mk({ discount_value: 100 })], true).final === MIN_CHARGE_IDR);
check("harga 0 tidak didiskon", priceFor({ id: "T", price_idr: 0 }, [mk({})], true).discount === 0);
check("potongan + final = harga asli", (() => { const r = priceFor(plan, [mk({ discount_value: 33 })], true); return r.discount + r.final === r.original; })());
check("diskon persen dibulatkan ke bawah", discountOf(mk({ discount_value: 15 }), 99999) === 14999);
check("promoIsLive batas akhir eksklusif", !promoIsLive(mk({ ends_at: new Date(1000).toISOString() }), 1000));

console.log("\nUpgrade tier");
const T1 = { id: "T1", price_idr: 199000, tier: 1 }, T2 = { id: "T2", price_idr: 399000, tier: 2 }, T3 = { id: "T3", price_idr: 599000, tier: 3 };
const own1 = { licenseId: "L1", tier: 1, planName: "Basic", creditIdr: 199000 };
check("tanpa kepemilikan: bayar penuh, tanpa kredit", (() => { const q = upgradeQuote(T2, null, [], false); return q.payable === 399000 && q.credit === 0 && q.upgradeFromLicenseId === null; })());
check("upgrade membayar selisih", upgradeQuote(T2, own1, [], false).payable === 200000);
check("upgrade memuat kredit dan id lisensi asal", (() => { const q = upgradeQuote(T2, own1, [], false); return q.credit === 199000 && q.upgradeFromLicenseId === "L1"; })());
check("tier sama ditolak", upgradeQuote(T1, own1, [], false) === null);
check("tier lebih rendah ditolak", upgradeQuote(T1, { ...own1, tier: 2 }, [], false) === null);
check("promo dipotong dulu, baru kredit", (() => { const q = upgradeQuote(T2, own1, [mk({ discount_value: 10 })], true); return q.discount === 39900 && q.payable === 399000 - 39900 - 199000; })());
check("rincian jumlahnya cocok: asli - promo - kredit = bayar", (() => { const q = upgradeQuote(T3, { ...own1, creditIdr: 399000 }, [mk({ discount_type: "fixed", discount_value: 50000 })], true); return q.original - q.discount - q.credit === q.payable; })());
check("kredit tidak membuat total di bawah batas minimum", (() => { const q = upgradeQuote({ ...T2, price_idr: 200000 }, { ...own1, creditIdr: 199500 }, [], false); return q.payable === MIN_CHARGE_IDR && q.original - q.discount - q.credit === q.payable; })());
check("kredit berantai: bayar sebelumnya + kredit sebelumnya", creditOf({ source: "payment" }, { amount_idr: 200000, credit_idr: 199000 }) === 399000);
check("lisensi dari kode atau admin tanpa kredit", creditOf({ source: "access_code" }, { amount_idr: 0 }) === 0 && creditOf({ source: "admin_grant" }, null) === 0);
check("urutan upgrade berantai tetap menjumlah", (() => { const first = upgradeQuote(T2, own1, [], false); const o2 = { licenseId: "L2", tier: 2, planName: "Plus", creditIdr: creditOf({ source: "payment" }, { amount_idr: first.payable, credit_idr: first.credit }) }; const second = upgradeQuote(T3, o2, [], false); return first.payable + second.payable + 199000 === 599000; })());

console.log("\nEvent Google Calendar");
const ctx = { ref: "raka-nadia", tz: "Asia/Jakarta", appUrl: "https://monaplan.test" };
const ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
check("ID event valid (a-v, 0-9)", ["task", "expense_payment", "event", "agenda"].every((s) => /^[0-9a-v]{5,1024}$/.test(eventIdFor(s, ID))));
check("ID event unik per jenis", new Set(["task", "expense_payment", "event", "agenda"].map((s) => eventIdFor(s, ID))).size === 4);
const out = buildDesiredEvents({
  tasks: [{ id: ID, title: "Booking venue", description: "Survei dulu", category: "Vendor", priority: "high", due_date: "2027-02-28" }],
  payments: [{ id: ID, label: null, kind: "dp", amount_idr: 5000000, due_date: "2027-03-01", notes: null }],
  events: [{ id: ID, name: "Akad Nikah", type: "akad", starts_at: "2027-05-01T02:00:00Z", ends_at: null, venue_name: "Masjid Agung", venue_address: "Malang", maps_url: null, dress_code: null, notes: null }],
  agenda: [
    { id: "a1", title: "Fitting", description: null, location: "Butik", starts_at: "2027-04-01T03:00:00Z", ends_at: "2027-04-01T05:00:00Z", all_day: false, remind_offsets_minutes: [1440, 60] },
    { id: "a2", title: "Hari bebas", description: null, location: null, starts_at: "2027-04-02T17:30:00Z", ends_at: null, all_day: true, remind_offsets_minutes: [] },
  ],
}, ctx);
const by = (s, id = ID) => out.find((e) => e.source === s && e.sourceId === id).body;
check("tugas: seharian, akhir = hari berikutnya", eq([by("task").start, by("task").end], [{ date: "2027-02-28" }, { date: "2027-03-01" }]));
check("tugas: judul berawalan 'Tugas:'", by("task").summary === "Tugas: Booking venue");
check("tugas: akhir bulan tidak salah hitung", eq(by("task").end, { date: "2027-03-01" }));
check("pembayaran: judul memakai jenis bila label kosong", by("expense_payment").summary === "Bayar: DP");
check("pembayaran: nominal ada di deskripsi", by("expense_payment").description.includes("5.000.000"));
check("acara: berjam dengan zona waktu proyek", by("event").start.timeZone === "Asia/Jakarta" && by("event").start.dateTime === "2027-05-01T02:00:00.000Z");
check("acara tanpa jam selesai: default 1 jam", by("event").end.dateTime === "2027-05-01T03:00:00.000Z");
check("acara: lokasi gabungan", by("event").location === "Masjid Agung, Malang");
check("agenda berjam: jam selesai dipakai", by("agenda", "a1").end.dateTime === "2027-04-01T05:00:00.000Z");
check("agenda: pengingat khusus", eq(by("agenda", "a1").reminders, { useDefault: false, overrides: [{ method: "popup", minutes: 1440 }, { method: "popup", minutes: 60 }] }));
check("agenda seharian: tanggal menurut zona proyek (UTC 17:30 = tgl berikutnya WIB)", eq(by("agenda", "a2").start, { date: "2027-04-03" }));
check("agenda tanpa pengingat tetap diberi pengingat 1 jam", eq(by("agenda", "a2").reminders, { useDefault: false, overrides: [{ method: "popup", minutes: 60 }] }));
check("tugas: pengingat 09.00 hari sebelumnya", eq(by("task").reminders, { useDefault: false, overrides: [{ method: "popup", minutes: 900 }] }));
check("pembayaran: pengingat H-7 dan H-1", eq(by("expense_payment").reminders.overrides.map((o) => o.minutes), [900, 10980]));
check("acara: pengingat 1 hari dan 1 jam", eq(by("event").reminders.overrides.map((o) => o.minutes), [1440, 60]));
check("tak ada event yang bergantung pada pengingat bawaan", out.every((e) => e.body.reminders.useDefault === false));
check("tautan balik ke Monaplan", by("task").description.includes("https://monaplan.test/app/raka-nadia/checklist"));
check("penanda event buatan Monaplan", by("task").extendedProperties.private.monaplan === "1");
const many = buildDesiredEvents({ tasks: [], payments: [], events: [], agenda: [{ id: "m", title: "x", description: null, location: null, starts_at: "2027-04-01T03:00:00Z", ends_at: null, all_day: false, remind_offsets_minutes: [1, 2, 3, 4, 5, 6, 7, 99999999] }] }, ctx);
check("pengingat maksimal 5 dan dalam batas 4 minggu", many[0].body.reminders.overrides.length === 5 && many[0].body.reminders.overrides.every((o) => o.minutes <= 40320));

console.log("\nRencana sinkron");
const d = (id, fp) => ({ source: "task", sourceId: id, eventId: "e" + id, body: {}, fingerprint: fp });
const plan2 = planSync([d("1", "a"), d("2", "b"), d("3", "c")], new Map([["task:1", { fingerprint: "a" }], ["task:2", { fingerprint: "OLD" }], ["task:9", { fingerprint: "z" }]]));
check("baru, diperbarui, tetap, dihapus terpisah", plan2.create.length === 1 && plan2.update.length === 1 && plan2.unchanged === 1 && eq(plan2.remove, ["task:9"]));

console.log("\nTemplate email");
const { renderEmail, sampleData, EMAIL_KINDS } = await load("src/lib/email/templates.mjs");
const every = (fn) => EMAIL_KINDS.every(fn);
const R = (l, d) => renderEmail(l, d, { appUrl: "https://x.test" });
check("semua jenis email punya subjek, html, dan teks di dua bahasa", every((k) => ["id", "en"].every((l) => { const r = R(l, sampleData(k)); return r.subject && r.html.includes("<html") && r.text.length > 20; })));
check("bahasa Inggris berbeda dari Indonesia (kecuali email internal tim)", every((k) => k === "support_ticket" || R("id", sampleData(k)).subject !== R("en", sampleData(k)).subject));
check("tombol mengarah ke url yang diberikan", every((k) => R("id", { ...sampleData(k), url: "https://monaplan.test/app/raka-nadia/budget" }).html.includes('href="https://monaplan.test/app/raka-nadia/budget"')));
const evil = R("id", { ...sampleData("task_due"), title: '<script>alert(1)</script>"x"', name: "<b>Hacker</b>" });
check("teks pengguna di-escape (tanpa XSS)", !evil.html.includes("<script>alert") && !evil.html.includes("<b>Hacker") && evil.html.includes("&lt;script&gt;"));
check("sapaan memakai nama depan", R("id", sampleData("task_due")).text.startsWith("Halo Raka,") && R("en", sampleData("task_due")).text.startsWith("Hi Raka,"));
check("pengingat agenda menyebut waktu relatif", R("id", { ...sampleData("agenda_reminder"), offsetMinutes: 60 }).body.includes("1 jam lagi") && R("en", { ...sampleData("agenda_reminder"), offsetMinutes: 0 }).body.includes("Starting now"));
check("kuitansi memuat rincian promo bila ada", R("id", sampleData("receipt")).text.includes("Promo Akhir Tahun") && !R("id", { ...sampleData("receipt"), discount: null }).text.includes("Promo:"));
check("email transaksional tanpa catatan berhenti langganan", !R("id", sampleData("receipt")).html.includes("Matikan lewat") && R("id", sampleData("task_due")).html.includes("Matikan lewat"));

console.log("\nWorker berkas (domain sendiri)");
process.env.FILES_SIGNING_SECRET = "rahasia-uji-berkas";
process.env.FILES_BASE_URL = "https://files.monaplan.test";
const { signFileUrl } = await load("src/lib/files-token.mjs");
const worker = (await import(pathToFileURL(path.join(ROOT, "workers/files/index.js")).href));
const store = new Map();
const env = {
  FILES_SIGNING_SECRET: process.env.FILES_SIGNING_SECRET, ALLOWED_ORIGINS: "https://monaplan.test",
  BUCKET: {
    put: async (k, body, o) => { store.set(k, { data: Buffer.from(await new Response(body).arrayBuffer()), ct: o.httpMetadata.contentType }); },
    get: async (k) => { const v = store.get(k); return v ? { body: v.data, size: v.data.length, httpMetadata: { contentType: v.ct } } : null; },
  },
};
const KEY = "raka-nadia-3f9a2c/documents/ktp-raka-a1b2c3d4.pdf";
const call = (url, init = {}) => worker.default.fetch(new Request(url, init), env);
const putUrl = signFileUrl("PUT", KEY, { ttl: 300, contentType: "application/pdf", size: 5 });
check("URL memakai domain sendiri dan jalur terbaca", putUrl.startsWith("https://files.monaplan.test/raka-nadia-3f9a2c/documents/ktp-raka-a1b2c3d4.pdf?"));
check("PUT sah tersimpan", (await call(putUrl, { method: "PUT", headers: { "Content-Type": "application/pdf", "Content-Length": "5" }, body: "%PDF-" })).status === 200 && store.has(KEY));
check("PUT dengan tipe berbeda ditolak", (await call(signFileUrl("PUT", KEY, { ttl: 300, contentType: "application/pdf", size: 5 }), { method: "PUT", headers: { "Content-Type": "text/html", "Content-Length": "5" }, body: "<html" })).status === 400);
check("PUT dengan ukuran berbeda ditolak", (await call(signFileUrl("PUT", KEY, { ttl: 300, contentType: "application/pdf", size: 5 }), { method: "PUT", headers: { "Content-Type": "application/pdf", "Content-Length": "9" }, body: "%PDF-1234" })).status === 400);
const getUrl = signFileUrl("GET", KEY, { ttl: 60, name: "KTP Raka.pdf" });
const got = await call(getUrl);
check("GET sah mengembalikan isi dan nama unduhan", got.status === 200 && (await got.text()) === "%PDF-" && got.headers.get("content-disposition").includes("KTP Raka.pdf") && got.headers.get("content-type") === "application/pdf");
check("tanda tangan GET tidak berlaku untuk PUT", (await call(getUrl, { method: "PUT", body: "x" })).status === 403);
check("kunci diubah ditolak", (await call(getUrl.replace("ktp-raka", "ktp-nadia"))).status === 403);
check("nama unduhan diubah ditolak", (await call(getUrl.replace("KTP+Raka", "evil"))).status === 403);
check("tautan kedaluwarsa ditolak", (await call(signFileUrl("GET", KEY, { ttl: 60, now: Date.now() - 3_600_000 }))).status === 403);
check("tanpa tanda tangan ditolak", (await call("https://files.monaplan.test/" + KEY)).status === 403);
check("berkas tak ada = 404", (await call(signFileUrl("GET", "x/documents/tidak-ada.pdf", { ttl: 60 }))).status === 404);
check("jalur .. ditolak", (await call("https://files.monaplan.test/a/../b?exp=9999999999&sig=x")).status === 400 || (await call("https://files.monaplan.test/a/..%2Fb?exp=9999999999&sig=x")).status === 400);
const pre = await call(putUrl, { method: "OPTIONS", headers: { Origin: "https://monaplan.test" } });
check("CORS hanya untuk alamat aplikasi", pre.headers.get("access-control-allow-origin") === "https://monaplan.test" && !(await call(putUrl, { method: "OPTIONS", headers: { Origin: "https://jahat.test" } })).headers.get("access-control-allow-origin"));
check("metode lain ditolak", (await call(getUrl, { method: "DELETE" })).status === 405);

console.log("\nToken dan state OAuth");
const tok = "1//refresh-token-rahasia";
const enc = encryptToken(tok);
check("token terenkripsi, bukan teks asli", !enc.includes("rahasia") && enc.split(".").length === 3);
check("dekripsi mengembalikan teks asli", decryptToken(enc) === tok);
check("enkripsi acak (IV berbeda)", encryptToken(tok) !== enc);
check("token yang diubah ditolak", (() => { try { decryptToken(enc.slice(0, -2) + "AA"); return false; } catch { return true; } })());
const st = signState({ u: "user-1", p: "proj-1" });
check("state sah terbaca", eq(verifyState(st), { u: "user-1", p: "proj-1" }));
check("state diubah ditolak", verifyState(st.replace(/^./, (c) => (c === "A" ? "B" : "A"))) === null);
check("state kedaluwarsa ditolak", verifyState(signState({ u: "u", p: "p" }, -1000)) === null);
check("state kosong ditolak", verifyState(null) === null && verifyState("abc") === null);

fs.rmSync(OUT, { recursive: true, force: true });
console.log(`\n${pass} lulus, ${bad} gagal`);
process.exit(bad ? 1 : 0);
