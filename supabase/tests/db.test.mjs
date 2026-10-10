// Uji migrasi, fungsi akses, dan RLS memakai PGlite (Postgres in-process) dengan stub skema auth dan storage Supabase.
// Jalankan: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { citext } from "@electric-sql/pglite/contrib/citext";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const db = new PGlite({ extensions: { pgcrypto, citext } });

const stub = `
create schema if not exists extensions;
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', current_setting('request.jwt.claim.email', true)) $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security; grant all on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;
await db.exec(stub);
for (const f of fs.readdirSync(ROOT).sort()) {
  try {
    await db.exec(fs.readFileSync(path.join(ROOT, f), "utf8"));
    console.log("OK migration", f);
  } catch (e) {
    console.error("FAIL migration", f, e.message);
    process.exit(1);
  }
}

let pass = 0, failN = 0;
async function as(uid, email, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false); select set_config('request.jwt.claim.email', '${email}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
async function expectOk(name, fn) {
  try { const r = await fn(); console.log("  PASS", name); pass++; return r; }
  catch (e) { console.log("  FAIL", name, "->", e.message); failN++; }
}
async function expectErr(name, pattern, fn) {
  try { await fn(); console.log("  FAIL", name, "-> expected error", pattern); failN++; }
  catch (e) { if (e.message.includes(pattern)) { console.log("  PASS", name, `(${pattern})`); pass++; } else { console.log("  FAIL", name, "-> wrong error", e.message); failN++; } }
}
const one = async (sql, p) => (await db.query(sql, p)).rows[0];

const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222";
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'a@x.com', '{"full_name":"Raka"}'), ($2, 'b@x.com', '{"name":"Nadia"}')`, [A, B]);
await expectOk("trigger membuat profiles", async () => { const r = await one(`select count(*)::int c from profiles`); if (r.c !== 2) throw new Error("count " + r.c); });

const timed = await one(`select id from plans where code='TIMED_12M'`);
const life = await one(`select id from plans where code='LIFETIME'`);
const batch = await one(`insert into access_code_batches (name, plan_id, quantity) values ('Uji', $1, 2) returning id`, [timed.id]);
await db.query(`insert into access_codes (code, batch_id, plan_id) values ('MNP-7K2M-9QXR-4HTP', $1, $2), ('MNP-0000-1111-2222', $1, $2)`, [batch.id, timed.id]);

console.log("\nKode akses");
await expectErr("format salah", "CODE_INVALID_FORMAT", () => as(A, "a@x.com", () => db.query(`select redeem_access_code('abc')`)));
await expectErr("kode tidak ada", "CODE_NOT_FOUND", () => as(A, "a@x.com", () => db.query(`select redeem_access_code('MNP-AAAA-BBBB-CCCC')`)));
await expectOk("tebus dengan huruf kecil, tanpa prefix, O dibaca 0", () => as(A, "a@x.com", () => db.query(`select * from redeem_access_code('7k2m 9qxr 4htp')`)));
await expectErr("tebus ulang oleh user sama", "CODE_ALREADY_REDEEMED_BY_USER", () => as(A, "a@x.com", () => db.query(`select redeem_access_code('MNP-7K2M-9QXR-4HTP')`)));
await expectErr("kode habis dipakai user lain", "CODE_ALREADY_USED", () => as(B, "b@x.com", () => db.query(`select redeem_access_code('MNP-7K2M-9QXR-4HTP')`)));
await expectOk("kode berstatus redeemed", async () => { const r = await one(`select status from access_codes where code='MNP-7K2M-9QXR-4HTP'`); if (r.status !== "redeemed") throw new Error(r.status); });
await expectOk("tebus dengan huruf O dan I (dibaca 0 dan 1)", () => as(A, "a@x.com", () => db.query(`select redeem_access_code('mnp-OOOO-IIII-2222')`)));
await expectOk("perpanjangan dimulai saat lisensi lama berakhir", async () => {
  const r = (await db.query(`select starts_at, ends_at from licenses where user_id=$1 order by starts_at`, [A])).rows;
  if (r.length !== 2 || +r[1].starts_at !== +r[0].ends_at) throw new Error(JSON.stringify(r));
});

console.log("\nProyek dan RLS");
const P = "33333333-3333-3333-3333-333333333333";
await expectErr("B tanpa lisensi tidak bisa buat proyek", "PROJECT_LIMIT_REACHED", () => as(B, "b@x.com", () => db.query(`insert into wedding_projects (id, owner_id, title, partner_one_name, partner_two_name) values (gen_random_uuid(), $1, 'X', 'a', 'b')`, [B])));
await expectOk("A membuat proyek", () => as(A, "a@x.com", () => db.query(`insert into wedding_projects (id, owner_id, title, partner_one_name, partner_two_name, wedding_date, total_budget_idr) values ($1, $2, 'Raka & Nadia', 'Raka', 'Nadia', '2027-02-13', 150000000)`, [P, A])));
await expectErr("batas 1 proyek per lisensi", "PROJECT_LIMIT_REACHED", () => as(A, "a@x.com", () => db.query(`insert into wedding_projects (id, owner_id, title, partner_one_name, partner_two_name) values (gen_random_uuid(), $1, 'Dua', 'a', 'b')`, [A])));
await expectOk("seed_project_defaults", () => as(A, "a@x.com", () => db.query(`select seed_project_defaults($1)`, [P])));
await expectOk("23 tugas dengan due date mundur", async () => {
  const r = await one(`select count(*)::int c, max(due_date)::text mx from tasks where project_id=$1`, [P]);
  if (r.c !== 23 || r.mx !== "2027-03-15") throw new Error(JSON.stringify(r));
});
await expectOk("12 kategori budget, 11 dokumen, 1 template", async () => {
  const r = await one(`select (select count(*) from budget_categories where project_id=$1)::int b, (select count(*) from document_checklist_items where project_id=$1)::int d, (select count(*) from message_templates where project_id=$1)::int m`, [P]);
  if (r.b !== 12 || r.d !== 11 || r.m !== 1) throw new Error(JSON.stringify(r));
});
await expectOk("B tidak melihat tugas A", () => as(B, "b@x.com", async () => { const r = await one(`select count(*)::int c from tasks`); if (r.c !== 0) throw new Error("bocor " + r.c); }));
await expectErr("B tidak bisa menulis ke proyek A", "row-level security", () => as(B, "b@x.com", () => db.query(`insert into tasks (project_id, title) values ($1, 'hack')`, [P])));
await expectOk("project_access_state = timed", () => as(A, "a@x.com", async () => { const r = await one(`select project_access_state($1) s`, [P]); if (r.s.state !== "timed") throw new Error(JSON.stringify(r.s)); }));
await expectErr("B tidak bisa membaca status akses proyek A", "FORBIDDEN", () => as(B, "b@x.com", () => db.query(`select project_access_state($1)`, [P])));

console.log("\nKolaborator");
const inv = await as(A, "a@x.com", () => one(`insert into project_invitations (project_id, email, role, invited_by) values ($1, 'B@x.com', 'editor', $2) returning token`, [P, A]));
await expectErr("email berbeda ditolak", "INVITATION_EMAIL_MISMATCH", () => as(B, "lain@x.com", () => db.query(`select accept_project_invitation($1)`, [inv.token])));
await expectOk("B menerima undangan", () => as(B, "b@x.com", () => db.query(`select accept_project_invitation($1)`, [inv.token])));
await expectOk("B (editor) bisa menulis tanpa lisensi sendiri", () => as(B, "b@x.com", () => db.query(`insert into tasks (project_id, title) values ($1, 'Tugas dari B')`, [P])));
await expectOk("B bisa melihat profil A (satu proyek)", () => as(B, "b@x.com", async () => { const r = await one(`select count(*)::int c from profiles`); if (r.c !== 2) throw new Error("c=" + r.c); }));
await expectErr("B tidak bisa mengubah role sendiri jadi admin", "permission denied", () => as(B, "b@x.com", () => db.query(`update profiles set role='admin' where id=$1`, [B])));

console.log("\nLisensi berakhir -> read-only");
await db.query(`update licenses set starts_at = now() - interval '800 days', ends_at = now() - interval '435 days' where user_id=$1 and starts_at = (select min(starts_at) from licenses where user_id=$1)`, [A]);
await db.query(`update licenses set starts_at = now() - interval '435 days', ends_at = now() - interval '70 days' where user_id=$1 and ends_at > now()`, [A]);
await expectOk("project_access_state = expired", () => as(A, "a@x.com", async () => { const r = await one(`select project_access_state($1) s`, [P]); if (r.s.state !== "expired") throw new Error(JSON.stringify(r.s)); }));
await expectErr("owner tidak bisa menulis saat lisensi habis", "row-level security", () => as(A, "a@x.com", () => db.query(`insert into tasks (project_id, title) values ($1, 'x')`, [P])));
await expectOk("owner tetap bisa membaca", () => as(A, "a@x.com", async () => { const r = await one(`select count(*)::int c from tasks`); if (r.c < 23) throw new Error("c=" + r.c); }));

console.log("\nUpgrade ke Selamanya");
await expectOk("issue_license lifetime", () => db.query(`select issue_license($1, $2, 'admin_grant')`, [A, life.id]));
await expectErr("lifetime kedua ditolak", "ALREADY_LIFETIME", () => db.query(`select issue_license($1, $2, 'admin_grant')`, [A, timed.id]));
await expectOk("project_access_state = lifetime", () => as(A, "a@x.com", async () => { const r = await one(`select project_access_state($1) s`, [P]); if (r.s.state !== "lifetime") throw new Error(JSON.stringify(r.s)); }));

console.log("\nPembayaran");
const ord = await one(`insert into orders (order_number, user_id, plan_id, amount_idr, expires_at) values ('MNP-20261009-ABC123', $1, $2, 99000, now() + interval '1 day') returning id`, [B, timed.id]);
await expectOk("grant_license_for_order", () => db.query(`select grant_license_for_order($1)`, [ord.id]));
await expectOk("idempoten (dipanggil dua kali, satu lisensi)", async () => {
  await db.query(`select grant_license_for_order($1)`, [ord.id]);
  const r = await one(`select count(*)::int c, (select status from orders where id=$1) s from licenses where order_id=$1`, [ord.id]);
  if (r.c !== 1 || r.s !== "paid") throw new Error(JSON.stringify(r));
});

console.log("\nRSVP");
const SLUG = (await one(`select slug from wedding_projects where id = $1`, [P])).slug;
await as(A, "a@x.com", () => db.query(`insert into guests (project_id, name, pax_invited) values ($1, 'Bapak Hendra', 2)`, [P]));
const rsvp = (name, status, pax, msg = '') => db.query(`select submit_rsvp_by_name($1, $2, $3::rsvp_status, $4::smallint, $5)`, [SLUG, name, status, pax, msg]);
await expectErr("pax melebihi kuota", "RSVP_PAX_INVALID", () => rsvp('Bapak Hendra', 'hadir', 3));
await expectOk("submit RSVP hadir 2 pax (nama cocok walau huruf dan sapaan beda)", () => rsvp('  hendra ', 'hadir', 2, 'Selamat!'));
await expectOk("guest_rsvp_summary", () => as(A, "a@x.com", async () => { const r = await one(`select * from guest_rsvp_summary where project_id=$1`, [P]); if (Number(r.attending_pax) !== 2) throw new Error(JSON.stringify(r)); }));
await expectOk("calendar_feed & budget_category_summary terbaca", () => as(A, "a@x.com", async () => { await db.query(`select * from calendar_feed limit 5`); await db.query(`select * from budget_category_summary limit 5`); }));

console.log("\nTrial, promo, dan pengaturan");
const C = "33333333-3333-3333-3333-333333333333", D = "55555555-5555-5555-5555-555555555555";
await db.query(`insert into auth.users (id, email) values ($1, 'c@x.com'), ($2, 'd@x.com')`, [C, D]);
await expectOk("seed: trial aktif 3 hari, promo aktif", async () => {
  const r = await one(`select (select value from app_settings where key='trial') t, (select value from app_settings where key='promo') p`);
  if (r.t.enabled !== true || r.t.days !== 3 || r.p.enabled !== true) throw new Error(JSON.stringify(r));
});
await expectOk("paket TIMED_12M disembunyikan, TRIAL tidak publik", async () => {
  const r = await one(`select (select is_active from plans where code='TIMED_12M') a, (select is_public from plans where code='TRIAL') p`);
  if (r.a !== false || r.p !== false) throw new Error(JSON.stringify(r));
});
await expectOk("start_trial menerbitkan lisensi 3 hari", () => as(C, "c@x.com", async () => {
  const r = await one(`select source::text s, round(extract(epoch from (ends_at - starts_at)) / 86400)::int d from start_trial()`);
  if (r.s !== "trial" || r.d !== 3) throw new Error(JSON.stringify(r));
}));
await expectErr("trial hanya sekali", "TRIAL_ALREADY_USED", () => as(C, "c@x.com", () => db.query(`select start_trial()`)));
await expectErr("pemilik lisensi tidak bisa trial", "ALREADY_HAS_LICENSE", () => as(B, "b@x.com", () => db.query(`select start_trial()`)));
await expectOk("durasi trial mengikuti pengaturan admin", async () => {
  await db.query(`update app_settings set value = '{"enabled": true, "days": 7}' where key='trial'`);
  await as(D, "d@x.com", async () => {
    const r = await one(`select round(extract(epoch from (ends_at - starts_at)) / 86400)::int d from start_trial()`);
    if (r.d !== 7) throw new Error("hari " + r.d);
  });
});
await expectOk("project_access_state menandai trial", async () => {
  await db.query(`insert into wedding_projects (owner_id, title, partner_one_name, partner_two_name) values ($1, 'Trial', 'Satu', 'Dua')`, [C]);
  const pr = await one(`select id from wedding_projects where owner_id=$1`, [C]);
  await as(C, "c@x.com", async () => {
    const r = await one(`select project_access_state($1) s`, [pr.id]);
    if (r.s.state !== "timed" || r.s.is_trial !== true) throw new Error(JSON.stringify(r.s));
  });
});
await expectOk("trial bisa di-upgrade ke lifetime lewat issue_license", async () => {
  await db.query(`select issue_license($1, $2, 'admin_grant')`, [C, life.id]);
  const r = await one(`select has_lifetime_license($1) l`, [C]);
  if (!r.l) throw new Error("tidak lifetime");
});
await expectErr("trial dimatikan admin", "TRIAL_DISABLED", async () => {
  await db.query(`update app_settings set value = '{"enabled": false, "days": 3}' where key='trial'`);
  const E = "66666666-6666-6666-6666-666666666666";
  await db.query(`insert into auth.users (id, email) values ($1, 'e@x.com')`, [E]);
  await as(E, "e@x.com", () => db.query(`select start_trial()`));
});
await expectOk("promo: hanya promo aktif yang terbaca publik", async () => {
  await db.query(`insert into promos (name, discount_type, discount_value, is_active) values ('Aktif', 'percent', 20, true), ('Mati', 'fixed', 10000, false)`);
  await db.exec(`set role anon`);
  try { const r = await one(`select count(*)::int c from promos`); if (r.c !== 1) throw new Error("terbaca " + r.c); } finally { await db.exec(`reset role`); }
});
await expectErr("promo persen maksimal 100", "violates check constraint", () => db.query(`insert into promos (name, discount_type, discount_value) values ('X', 'percent', 150)`));
await expectOk("pengguna tidak bisa mengubah pengaturan", () => as(A, "a@x.com", async () => {
  const r = await db.query(`update app_settings set value = '{}' where key='promo'`);
  if (r.affectedRows) throw new Error("pengaturan berubah");
}).catch((e) => { if (!/permission denied|row-level security/.test(e.message)) throw e; }));
await expectOk("token Google tidak terbaca pengguna", async () => {
  await db.query(`insert into google_calendar_links (user_id, refresh_token_enc) values ($1, 'rahasia')`, [A]);
  await as(A, "a@x.com", async () => { const r = await one(`select count(*)::int c from google_calendar_links`); if (r.c !== 0) throw new Error("token terbaca"); });
});

console.log("\nSlug proyek");
await expectOk("slug dibuat otomatis dari nama pasangan", async () => {
  const r = await one(`select slug, storage_prefix from wedding_projects where id = $1`, [P]);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug)) throw new Error(r.slug);
  if (!r.storage_prefix.startsWith(r.slug + "-")) throw new Error(JSON.stringify(r));
});
await expectOk("slug kembar mendapat akhiran angka", async () => {
  const mk = () => one(`insert into wedding_projects (owner_id, title, partner_one_name, partner_two_name) values ($1, 'Kembar', 'Dina Putri', 'Eko Wijaya') returning slug`, [D]);
  await db.query(`select issue_license($1, $2, 'admin_grant')`, [D, life.id]).catch(() => {});
  await db.query(`insert into licenses (user_id, plan_id, source) select $1, $2, 'admin_grant' where not exists (select 1 from licenses where user_id=$1 and ends_at is null)`, [D, life.id]);
  await db.query(`update plans set max_projects = 5 where id = $1`, [life.id]);
  const a = await mk(), b = await mk();
  if (a.slug !== "dina-eko" || b.slug !== "dina-eko-2") throw new Error(a.slug + " / " + b.slug);
});
await expectOk("ganti slug mencatat slug lama di riwayat", async () => {
  const pr = await one(`select id, slug from wedding_projects where owner_id=$1 limit 1`, [D]);
  await db.query(`update wedding_projects set slug = 'pernikahan-dina' where id = $1`, [pr.id]);
  const h = await one(`select project_id from project_slug_history where slug = $1`, [pr.slug]);
  if (h.project_id !== pr.id) throw new Error("riwayat tidak tercatat");
});
await expectErr("slug yang dipakai proyek lain ditolak", "SLUG_TAKEN", async () => {
  const pr = await one(`select id from wedding_projects where owner_id=$1 and slug <> 'pernikahan-dina' limit 1`, [D]);
  await db.query(`update wedding_projects set slug = 'pernikahan-dina' where id = $1`, [pr.id]);
});
await expectErr("slug dengan huruf besar ditolak", "SLUG_INVALID", async () => {
  const pr = await one(`select id from wedding_projects where owner_id=$1 limit 1`, [D]);
  await db.query(`update wedding_projects set slug = 'Tidak Valid' where id = $1`, [pr.id]);
});
await expectErr("jalur berkas tidak bisa diubah", "STORAGE_PREFIX_IMMUTABLE", async () => {
  const pr = await one(`select id from wedding_projects where owner_id=$1 limit 1`, [D]);
  await db.query(`update wedding_projects set storage_prefix = 'lain' where id = $1`, [pr.id]);
});
await expectOk("slug lama tidak bisa diambil proyek baru", async () => {
  const old = await one(`select slug from project_slug_history limit 1`);
  const r = await one(`select unique_project_slug($1) s`, [old.slug]);
  if (r.s === old.slug) throw new Error("slug lama dipakai ulang");
});

console.log("\nTingkat paket dan upgrade");
const T2 = (await one(`insert into plans (code, name, type, price_idr, tier, max_projects, max_collaborators, storage_quota_mb) values ('PRO', 'Monaplan Pro', 'lifetime', 399000, 2, 3, 6, 200) returning id`)).id;
const F = "77777777-7777-7777-7777-777777777777";
await db.query(`insert into auth.users (id, email) values ($1, 'f@x.com')`, [F]);
await db.query(`select issue_license($1, $2, 'admin_grant')`, [F, life.id]);
await expectOk("plans.tier ada, TRIAL bertier 0", async () => {
  const r = await one(`select (select tier from plans where code='TRIAL') t0, (select tier from plans where code='LIFETIME') t1`);
  if (r.t0 !== 0 || r.t1 !== 1) throw new Error(JSON.stringify(r));
});
await expectOk("can_upgrade_to: tier lebih tinggi boleh, sama tidak", async () => {
  const r = await one(`select can_upgrade_to($1, $2) up, can_upgrade_to($1, $3) same`, [F, T2, life.id]);
  if (r.up !== true || r.same !== false) throw new Error(JSON.stringify(r));
});
await expectOk("upgrade ke tier lebih tinggi: lisensi lama superseded, baru aktif", async () => {
  await db.query(`select issue_license($1, $2, 'payment')`, [F, T2]);
  const r = await one(`select count(*) filter (where status='superseded')::int old, count(*) filter (where status='active' and ends_at is null)::int cur, (lifetime_tier($1)) tier from licenses where user_id=$1`, [F]);
  if (r.old !== 1 || r.cur !== 1 || r.tier !== 2) throw new Error(JSON.stringify(r));
});
await expectErr("turun tier ditolak", "ALREADY_LIFETIME", () => db.query(`select issue_license($1, $2, 'admin_grant')`, [F, life.id]));
await expectOk("grant_license_for_order menaikkan tier lewat order lunas", async () => {
  const G = "88888888-8888-8888-8888-888888888888";
  await db.query(`insert into auth.users (id, email) values ($1, 'g@x.com')`, [G]);
  await db.query(`select issue_license($1, $2, 'payment')`, [G, life.id]);
  const o = await one(`insert into orders (order_number, user_id, plan_id, amount_idr, credit_idr, expires_at) values ('MNP-20261009-UPG001', $1, $2, 200000, 199000, now() + interval '1 day') returning id`, [G, T2]);
  await db.query(`select grant_license_for_order($1)`, [o.id]);
  const r = await one(`select lifetime_tier($1) tier, (select status from orders where id=$2) st, (select needs_review from orders where id=$2) nr`, [G, o.id]);
  if (r.tier !== 2 || r.st !== "paid" || r.nr !== false) throw new Error(JSON.stringify(r));
});
await expectOk("order di tier yang sama tetap ditandai tinjau (bukan upgrade)", async () => {
  const o = await one(`insert into orders (order_number, user_id, plan_id, amount_idr, expires_at) values ('MNP-20261009-DUP001', $1, $2, 199000, now() + interval '1 day') returning id`, [F, life.id]);
  await db.query(`select grant_license_for_order($1)`, [o.id]);
  const r = await one(`select needs_review nr, status st from orders where id=$1`, [o.id]);
  if (!r.nr || r.st !== "paid") throw new Error(JSON.stringify(r));
});
await expectOk("kuota bawaan 50 MB", async () => {
  const r = await one(`select (select max(storage_quota_mb) from plans where code in ('LIFETIME','TIMED_12M','TRIAL')) q, (select column_default from information_schema.columns where table_name='plans' and column_name='storage_quota_mb') d`);
  if (r.q !== 50 || !String(r.d).includes("50")) throw new Error(JSON.stringify(r));
});

console.log("\nBahasa dan tiket bantuan");
await expectOk("pengguna mengubah bahasanya sendiri", () => as(A, "a@x.com", async () => {
  await db.query(`update profiles set language = 'en' where id = $1`, [A]);
  const r = await one(`select language from profiles where id=$1`, [A]);
  if (r.language !== "en") throw new Error(r.language);
}));
await expectErr("bahasa selain id/en ditolak", "violates check constraint", () => db.query(`update profiles set language = 'fr' where id = $1`, [A]));
await expectOk("tabel tiket bantuan, kolom rsvp_token, dan fungsi lama sudah dibuang", async () => {
  const r = await one(`select to_regclass('public.support_tickets') t, (select count(*)::int from information_schema.columns where table_name = 'guests' and column_name = 'rsvp_token') c, (select count(*)::int from pg_proc where proname = 'submit_rsvp') f`);
  if (r.t !== null || r.c !== 0 || r.f !== 0) throw new Error(JSON.stringify(r));
});

console.log("\nKode promo, template RSVP, notifikasi RSVP");
await expectOk("kode promo tersimpan dan unik tanpa membedakan huruf", async () => {
  await db.query(`insert into promos (name, discount_type, discount_value, code) values ('Uji kode', 'percent', 10, 'NIKAH2026')`);
});
await expectErr("kode promo kembar (huruf berbeda) ditolak", "duplicate key", () => db.query(`insert into promos (name, discount_type, discount_value, code) values ('Kembar', 'percent', 10, 'nikah2026')`));
await expectErr("kode promo dengan spasi ditolak", "violates check constraint", () => db.query(`insert into promos (name, discount_type, discount_value, code) values ('Spasi', 'percent', 10, 'ada spasi')`));
await expectOk("dua promo tanpa kode boleh ada", () => db.query(`insert into promos (name, discount_type, discount_value) values ('Otomatis 1', 'percent', 5), ('Otomatis 2', 'percent', 5)`));
await expectErr("sasaran popup di luar daftar ditolak", "violates check constraint", () => db.query(`insert into promos (name, discount_type, discount_value, popup_audience) values ('X', 'percent', 5, 'semua')`));
await expectErr("batas pemakaian 0 ditolak", "violates check constraint", () => db.query(`insert into promos (name, discount_type, discount_value, max_uses) values ('Nol', 'percent', 5, 0)`));
await expectOk("batas pemakaian positif atau kosong diterima", () => db.query(`insert into promos (name, discount_type, discount_value, max_uses) values ('Terbatas', 'percent', 5, 10), ('Bebas', 'percent', 5, null)`));
await expectOk("template RSVP bawaan elegan_minimalis", async () => {
  const r = await one(`select rsvp_template t from wedding_projects where id = $1`, [P]);
  if (r.t !== "elegan_minimalis") throw new Error(r.t);
});
await expectErr("template RSVP di luar daftar ditolak", "violates check constraint", () => db.query(`update wedding_projects set rsvp_template = 'norak' where id = $1`, [P]));
const H = "99999999-9999-9999-9999-999999999991", V = "99999999-9999-9999-9999-999999999992";
await db.query(`insert into auth.users (id, email) values ($1, 'h@x.com'), ($2, 'v@x.com')`, [H, V]);
await db.query(`insert into project_members (project_id, user_id, role) values ($1, $2, 'editor'), ($1, $3, 'viewer')`, [P, H, V]);
await as(A, "a@x.com", () => db.query(`insert into guests (project_id, name, pax_invited) values ($1, 'Ibu Sari', 3)`, [P]));
await rsvp('Ibu Sari', 'hadir', 2);
await expectOk("RSVP membuat notifikasi untuk pemilik", () => as(A, "a@x.com", async () => {
  const r = await one(`select count(*)::int c, max(body) b, max(link_path) l from notifications where type = 'rsvp_response' and body like 'Ibu Sari%'`);
  if (r.c !== 1 || r.b !== "Ibu Sari: Hadir (2 orang)" || !r.l.endsWith("/tamu")) throw new Error(JSON.stringify(r));
}));
await expectOk("RSVP membuat notifikasi untuk editor", () => as(H, "h@x.com", async () => {
  const r = await one(`select count(*)::int c from notifications where body like 'Ibu Sari%'`);
  if (r.c !== 1) throw new Error("c=" + r.c);
}));
await expectOk("RSVP tidak membuat notifikasi untuk viewer", () => as(V, "v@x.com", async () => {
  const r = await one(`select count(*)::int c from notifications where body like 'Ibu Sari%'`);
  if (r.c !== 0) throw new Error("c=" + r.c);
}));
const X = "99999999-9999-9999-9999-999999999994";
await db.query(`insert into auth.users (id, email) values ($1, 'x@x.com')`, [X]);
await expectOk("pengguna di luar proyek tidak melihat notifikasi orang lain", () => as(X, "x@x.com", async () => {
  const r = await one(`select count(*)::int c from notifications where body like 'Ibu Sari%'`);
  if (r.c !== 0) throw new Error("bocor");
}));
await rsvp('Ibu Sari', 'tidak_hadir', 0);
await expectOk("jawaban kedua tamu membuat notifikasi baru, tanpa duplikat", () => as(A, "a@x.com", async () => {
  const r = await one(`select count(*)::int c from notifications where body like 'Ibu Sari%'`);
  if (r.c < 1 || r.c > 2) throw new Error("c=" + r.c);
}));
console.log("\nRSVP lewat nama");
await expectOk("normalisasi nama membuang sapaan dan tanda baca", async () => {
  const r = await one(`select normalize_guest_name('  Bapak  H. Hendra, S.T. ') n`);
  if (r.n !== "h hendra s t") throw new Error(r.n);
});
await expectOk("rsvp_lookup menemukan satu tamu", async () => {
  const r = (await one(`select rsvp_lookup($1, 'ibu sari') r`, [SLUG])).r;
  if (r.matches !== 1 || r.guest.name !== "Ibu Sari") throw new Error(JSON.stringify(r));
});
await expectErr("tautan dengan slug tak dikenal ditolak", "RSVP_NOT_FOUND", () => db.query(`select submit_rsvp_by_name('tidak-ada-slug', 'Budi', 'hadir', 1::smallint, '')`));
await expectErr("nama kosong ditolak", "RSVP_NAME_INVALID", () => rsvp('   ', 'hadir', 1));
await expectOk("nama yang belum ada dicatat sebagai tamu baru bertanda mendaftar sendiri", async () => {
  await rsvp('Pak Wayan Sudarma', 'hadir', 2, 'Om Swastyastu');
  const r = await one(`select self_registered s, pax_invited p, rsvp_status st from guests where project_id = $1 and name = 'Pak Wayan Sudarma'`, [P]);
  if (!r.s || r.p !== 2 || r.st !== "hadir") throw new Error(JSON.stringify(r));
});
await expectOk("jawaban kedua dari nama yang sama memperbarui, bukan menambah", async () => {
  await rsvp('wayan sudarma', 'tidak_hadir', 0);
  const r = await one(`select count(*)::int c, max(rsvp_status::text) st from guests where project_id = $1 and normalize_guest_name(name) = 'wayan sudarma'`, [P]);
  if (r.c !== 1 || r.st !== "tidak_hadir") throw new Error(JSON.stringify(r));
});
await expectErr("tamu baru maksimal 5 orang", "RSVP_PAX_INVALID", () => rsvp('Tamu Rombongan', 'hadir', 6));
await as(A, "a@x.com", () => db.query(`insert into guests (project_id, name) values ($1, 'Made Ayu'), ($1, 'Bu Made Ayu')`, [P]));
await expectOk("nama persis menang atas kecocokan tanpa sapaan", async () => {
  const r = (await one(`select rsvp_lookup($1, 'made ayu') r`, [SLUG])).r;
  if (r.matches !== 1 || r.guest.name !== "Made Ayu") throw new Error(JSON.stringify(r));
});
await expectErr("sapaan lain yang cocok dengan dua tamu ambigu", "RSVP_NAME_AMBIGUOUS", () => rsvp('Mas Made Ayu', 'hadir', 1));
await expectOk("rsvp_lookup melaporkan dua kecocokan", async () => {
  const r = (await one(`select rsvp_lookup($1, 'mas made ayu') r`, [SLUG])).r;
  if (r.matches !== 2) throw new Error(JSON.stringify(r));
});
await as(A, "a@x.com", () => db.query(`insert into guests (project_id, name, pax_invited) values ($1, 'Bapak Budi', 2), ($1, 'Ibu Budi', 2)`, [P]));
await expectOk("nama persis dengan sapaan membedakan Bapak Budi dan Ibu Budi", async () => {
  await rsvp('Bapak Budi', 'hadir', 2);
  const r = await one(`select name, rsvp_status st from guests where project_id = $1 and name in ('Bapak Budi', 'Ibu Budi') order by name`, [P]);
  const all = (await db.query(`select name, rsvp_status st from guests where project_id = $1 and name in ('Bapak Budi', 'Ibu Budi') order by name`, [P])).rows;
  if (all[0].name !== "Bapak Budi" || all[0].st !== "hadir" || all[1].st !== "belum_respon") throw new Error(JSON.stringify(all));
});
await expectErr("nama tanpa sapaan yang cocok dengan dua tamu tetap ambigu", "RSVP_NAME_AMBIGUOUS", () => rsvp('Budi', 'hadir', 1));
await expectOk("rsvp_lookup nama persis menemukan satu tamu dan tidak membocorkan ucapan", async () => {
  const r = (await one(`select rsvp_lookup($1, 'ibu budi') r`, [SLUG])).r;
  if (r.matches !== 1 || r.guest.name !== "Ibu Budi" || "rsvp_message" in r.guest) throw new Error(JSON.stringify(r));
});
for (let i = 0; i < 50; i++) await db.query(`insert into guests (project_id, name, self_registered) values ($1, $2, true)`, [P, `Pendaftar ${i}`]);
await expectErr("tamu baru setelah 50 dalam sehari ditolak", "RSVP_TOO_MANY", () => rsvp('Pendaftar Baru Sekali', 'hadir', 1));
await expectOk("slug yang bentrok dengan rute aplikasi diganti", async () => {
  const r = await one(`select unique_project_slug('admin') s, unique_project_slug('login') l, unique_project_slug('raka-nadia-baru') o`);
  if (r.s === "admin" || r.l === "login" || r.o !== "raka-nadia-baru") throw new Error(JSON.stringify(r));
});
await expectOk("lisensi dicabut bisa dihapus tanpa merusak order", async () => {
  const O = "99999999-9999-9999-9999-999999999993";
  await db.query(`insert into auth.users (id, email) values ($1, 'o@x.com')`, [O]);
  const l = await one(`insert into licenses (user_id, plan_id, source, status, revoked_reason) values ($1, $2, 'admin_grant', 'revoked', 'uji') returning id`, [O, life.id]);
  await db.query(`delete from licenses where id = $1`, [l.id]);
  const r = await one(`select count(*)::int c from licenses where id = $1`, [l.id]);
  if (r.c !== 0) throw new Error("masih ada");
});

console.log("\nPapan Inspirasi dan Perjalanan Berdua");
await expectOk("editor menambah item inspirasi", () => as(H, "h@x.com", () => db.query(`insert into inspiration_items (project_id, category, title, color) values ($1, 'dekorasi', 'Backdrop bunga putih', '#FFFFFF')`, [P])));
await expectErr("viewer tidak bisa menambah item inspirasi", "row-level security", () => as(V, "v@x.com", () => db.query(`insert into inspiration_items (project_id, title) values ($1, 'X')`, [P])));
await expectOk("viewer boleh membaca item inspirasi", () => as(V, "v@x.com", async () => { const r = await one(`select count(*)::int c from inspiration_items`); if (r.c < 1) throw new Error("c=" + r.c); }));
await expectErr("warna di luar format hex ditolak", "violates check constraint", () => as(H, "h@x.com", () => db.query(`insert into inspiration_items (project_id, title, color) values ($1, 'Warna', 'merah')`, [P])));
await expectErr("kategori inspirasi di luar daftar ditolak", "violates check constraint", () => as(H, "h@x.com", () => db.query(`insert into inspiration_items (project_id, title, category) values ($1, 'X', 'lain')`, [P])));
await expectOk("pengguna di luar proyek tidak melihat inspirasi", () => as(X, "x@x.com", async () => { const r = await one(`select count(*)::int c from inspiration_items`); if (r.c !== 0) throw new Error("bocor"); }));
await expectOk("owner menyimpan rencana perjalanan", () => as(A, "a@x.com", () => db.query(`insert into trip_plans (project_id, destination, start_date, end_date, budget_idr) values ($1, 'Labuan Bajo', '2027-03-20', '2027-03-25', 15000000)`, [P])));
await expectErr("tanggal pulang sebelum berangkat ditolak", "violates check constraint", () => as(A, "a@x.com", () => db.query(`update trip_plans set end_date = '2027-03-10' where project_id = $1`, [P])));
await expectErr("rencana perjalanan kedua untuk proyek yang sama ditolak", "duplicate key", () => as(A, "a@x.com", () => db.query(`insert into trip_plans (project_id) values ($1)`, [P])));
await expectOk("editor menambah butir perjalanan", () => as(H, "h@x.com", () => db.query(`insert into trip_items (project_id, day_date, kind, title, cost_idr) values ($1, '2027-03-21', 'akomodasi', 'Hotel dekat pantai', 3200000)`, [P])));
await expectErr("viewer tidak bisa mengubah butir perjalanan", "", async () => { const r = await as(V, "v@x.com", () => db.query(`update trip_items set is_booked = true where project_id = $1 returning id`, [P])); if (r.rows.length) throw new Error("terubah"); throw new Error("tidak ada baris terubah"); });
await expectErr("biaya perjalanan negatif ditolak", "violates check constraint", () => as(H, "h@x.com", () => db.query(`insert into trip_items (project_id, title, cost_idr) values ($1, 'Aneh', -5)`, [P])));

console.log("\nStorage policy");
await expectOk("A boleh unggah ke folder proyeknya", () => as(A, "a@x.com", () => db.query(`insert into storage.objects (bucket_id, name) values ('project-files', $1)`, [`${P}/documents/x.pdf`])));
await expectOk("A boleh unggah ke folder bernama storage_prefix proyeknya", async () => {
  const r = await one(`select storage_prefix sp from wedding_projects where id = $1`, [P]);
  await as(A, "a@x.com", () => db.query(`insert into storage.objects (bucket_id, name) values ('project-files', $1)`, [`${r.sp}/documents/ktp-a1b2c3d4.pdf`]));
});
await expectErr("B tidak bisa unggah ke folder storage_prefix proyek orang lain", "row-level security", async () => {
  const r = await one(`select storage_prefix sp from wedding_projects where owner_id = $1 limit 1`, [D]);
  await as(B, "b@x.com", () => db.query(`insert into storage.objects (bucket_id, name) values ('project-files', $1)`, [`${r.sp}/documents/x.pdf`]));
});
await expectErr("B tidak bisa unggah ke proyek yang bukan miliknya", "row-level security", () => as(B, "b@x.com", () => db.query(`insert into storage.objects (bucket_id, name) values ('project-files', $1)`, [`44444444-4444-4444-4444-444444444444/documents/x.pdf`])));

console.log(`\n${pass} lulus, ${failN} gagal`);
process.exit(failN ? 1 : 0);
