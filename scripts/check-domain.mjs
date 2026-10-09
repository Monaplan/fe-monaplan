// Memeriksa konfigurasi domain: env aplikasi harus konsisten satu sama lain, lalu mencetak daftar URL
// yang harus disamakan di Supabase, Google, Midtrans, Resend, dan Cloudflare.
// Pakai: npm run check:domain   (membaca .env)
import fs from "node:fs";

const env = { ...process.env };
try {
  for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) env[m[1]] = m[2].trim();
  }
} catch {}

const problems = [];
const ok = (msg) => console.log("  OK  ", msg);
const bad = (msg) => { problems.push(msg); console.log("  X   ", msg); };

const app = (env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
console.log("Aplikasi");
if (!app) bad("NEXT_PUBLIC_APP_URL belum diisi");
else {
  const u = new URL(app);
  const local = ["localhost", "127.0.0.1"].includes(u.hostname);
  ok(`NEXT_PUBLIC_APP_URL = ${app}${local ? "  (lokal)" : ""}`);
  if (!local && u.protocol !== "https:") bad("Domain produksi harus memakai https");
  if (u.pathname !== "/" && u.pathname !== "") bad("NEXT_PUBLIC_APP_URL tidak boleh memuat path");
  if (/trycloudflare\.com$/.test(u.hostname)) bad("Alamat quick tunnel berganti tiap dijalankan; pakai named tunnel atau domain sendiri untuk produksi");
}

console.log("\nBerkas");
const files = env.FILES_BASE_URL?.replace(/\/$/, "");
if (!files) ok("FILES_BASE_URL kosong: berkas memakai alamat R2 langsung");
else {
  ok(`FILES_BASE_URL = ${files}`);
  if (!env.FILES_SIGNING_SECRET) bad("FILES_SIGNING_SECRET wajib diisi bila FILES_BASE_URL diisi");
  else if (env.FILES_SIGNING_SECRET.length < 32) bad("FILES_SIGNING_SECRET minimal 32 karakter");
  else ok("FILES_SIGNING_SECRET terisi");
  if (app && new URL(files).origin === new URL(app).origin) bad("Domain berkas sebaiknya subdomain terpisah dari aplikasi (mis. files.domainmu.com)");
}
if (!env.R2_BUCKET && !env.R2_ACCOUNT_ID) console.log("  --   R2 belum diisi: berkas memakai Supabase Storage");

console.log("\nEmail dan pengingat");
env.RESEND_API_KEY ? ok("RESEND_API_KEY terisi") : bad("RESEND_API_KEY kosong: email tidak terkirim");
if (env.EMAIL_FROM) {
  ok(`EMAIL_FROM = ${env.EMAIL_FROM}`);
  if (/resend\.dev/.test(env.EMAIL_FROM)) bad("EMAIL_FROM masih onboarding@resend.dev: hanya bisa mengirim ke emailmu sendiri. Verifikasi domain di Resend");
} else bad("EMAIL_FROM kosong");
env.CRON_SECRET && env.CRON_SECRET.length >= 32 ? ok("CRON_SECRET terisi") : bad("CRON_SECRET kosong atau kurang dari 32 karakter: pengingat tidak akan berjalan");
env.SUPPORT_EMAIL ? ok(`SUPPORT_EMAIL = ${env.SUPPORT_EMAIL}`) : console.log("  --   SUPPORT_EMAIL kosong: tiket bantuan tersimpan tetapi tim tidak diberi email");

console.log("\nGoogle");
env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? ok("Kredensial Google terisi") : console.log("  --   GOOGLE_CLIENT_ID/SECRET kosong: Google Calendar dan login Google tidak aktif");

console.log("\nSamakan URL berikut di dashboard masing-masing:");
if (app) {
  console.log(`  Supabase > Authentication > URL Configuration`);
  console.log(`     Site URL                 ${app}`);
  console.log(`     Redirect URLs            ${app}/auth/callback  dan  ${app}/auth/confirm`);
  console.log(`  Google Cloud > Clients > Authorized redirect URIs`);
  console.log(`     ${app}/api/google/callback`);
  console.log(`  Midtrans > Settings > Payment > Notification URL`);
  console.log(`     ${app}/api/webhooks/midtrans`);
  console.log(`  Penjadwal pengingat (pg_cron/pg_net atau Cloudflare Cron) memanggil`);
  console.log(`     ${app}/api/cron/reminders   dengan header Authorization: Bearer <CRON_SECRET>`);
  if (files) console.log(`  Cloudflare Worker (workers/files/wrangler.toml)\n     route: ${new URL(files).hostname}   ALLOWED_ORIGINS: ${app}`);
  else console.log(`  Cloudflare R2 > CORS: izinkan origin ${app} (metode PUT, GET)`);
}
console.log(problems.length ? `\n${problems.length} hal perlu diperbaiki` : "\nKonfigurasi konsisten");
process.exit(problems.length ? 1 : 0);
