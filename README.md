# Monaplan

Aplikasi web wedding planner all-in-one, dibangun dari `PRD.md`, `ERD.md`, dan `DESIGN.md`.

**Stack:** Next.js 16 (App Router, TypeScript) · Supabase (PostgreSQL + RLS, Auth) · Cloudflare R2 · Midtrans Snap · Tailwind CSS v4 · Recharts · Resend

## Menjalankan secara lokal

### 1. Buat project Supabase (region Singapura)

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** dan jalankan isi file di `supabase/migrations/` secara berurutan:
   - `20261009000001_schema.sql` (tabel, trigger, fungsi akses, RLS, view, index, storage)
   - `20261009000002_app_helpers.sql`
   - `20261009000003_seed.sql` (paket contoh dan template checklist)

   Atau dengan Supabase CLI: `npx supabase link --project-ref <ref>` lalu `npx supabase db push`.
3. **Authentication → Providers → Google**: aktifkan, isi Client ID dan Secret dari Google Cloud Console.
   Di Google Cloud, tambahkan redirect URI `https://<ref>.supabase.co/auth/v1/callback`.
4. **Authentication → URL Configuration**: Site URL `http://localhost:3000`, tambahkan `http://localhost:3000/auth/callback` ke Redirect URLs.

### 2. Isi environment

```bash
cp .env.example .env.local
```

| Variabel | Sumber |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SECRET_KEY` | Secret / service role key (hanya server) |
| `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Dashboard Midtrans Sandbox → Settings → Access Keys |
| `RESEND_API_KEY`, `EMAIL_FROM` | Opsional. Tanpa ini, email dilewati |
| `NEXT_PUBLIC_APP_URL` | Domain produksi (`https://...`). Dipakai untuk URL kanonis, sitemap, dan gambar Open Graph |
| `GOOGLE_SITE_VERIFICATION` | Opsional, kode verifikasi Google Search Console |

SEO (metadata, `robots.txt`, `sitemap.xml`, JSON-LD, noindex untuk halaman privat) dijelaskan di `PRD.md` bagian 16.

### 3. Jalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000, masuk dengan Google, lalu jadikan akunmu admin di SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'emailkamu@gmail.com';
```

Dari `/admin/kode` buat batch kode akses, lalu tebus di `/aktivasi` untuk mulai tanpa pembayaran.

### 4. Penyimpanan berkas di Cloudflare R2

Dokumen, foto mahar/seserahan, dan foto sampul disimpan di Cloudflare R2 (bucket privat). Selama kredensial R2 kosong, aplikasi otomatis memakai Supabase Storage.

1. Cloudflare Dashboard → **R2 Object Storage** → **Create bucket**, misalnya `monaplan-files`. Jangan aktifkan akses publik.
2. **R2 → Manage API tokens → Create API token**: izin **Object Read & Write**, batasi ke bucket tadi. Salin Access Key ID dan Secret Access Key (secret hanya tampil sekali).
3. Account ID ada di halaman R2 (atau di URL dashboard). Isi di `.env.local`:

   ```env
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=monaplan-files
   ```
4. Pasang CORS agar browser boleh mengunggah langsung ke bucket:

   ```bash
   npm run r2:setup                                  # localhost:3000 + NEXT_PUBLIC_APP_URL
   npm run r2:setup https://xxxx.trycloudflare.com   # tambah origin lain, misal URL tunnel
   ```
5. Restart `npm run dev`. Unggahan berikutnya masuk ke R2.

Akses berkas dicek di server (anggota proyek, peran Owner/Editor, lisensi aktif, tipe dan ukuran file, kuota paket) sebelum URL bertanda tangan dibuat. Detail alur ada di `ERD.md` bagian 9.

### 5. Tunnel untuk development (opsional)

R2 tidak memerlukan tunnel. Tunnel dipakai bila localhost perlu diakses dari internet, misalnya untuk menerima webhook Midtrans atau mencoba aplikasi dari HP:

```bash
npm run dev       # terminal 1
npm run tunnel    # terminal 2, menampilkan URL https://xxxx.trycloudflare.com
```

Lalu:
- Midtrans → Settings → Payment → Notification URL: `https://xxxx.trycloudflare.com/api/webhooks/midtrans`
- Bila login atau unggah lewat URL tunnel: tambahkan `https://xxxx.trycloudflare.com/auth/callback` di Supabase → Redirect URLs, dan jalankan `npm run r2:setup https://xxxx.trycloudflare.com`.

URL quick tunnel berganti setiap kali dijalankan. Untuk URL tetap, buat named tunnel di Cloudflare Zero Trust dengan domainmu sendiri.

### 6. Pembayaran Midtrans (sandbox)

Di dashboard Midtrans → Settings → Payment → Notification URL isi `https://<domain>/api/webhooks/midtrans`.
Untuk lokal, pakai `npm run tunnel` (lihat langkah 5) agar webhook bisa masuk.

### 7. Pengingat otomatis

```bash
npx supabase functions deploy send-reminders
npx supabase secrets set APP_URL=https://domainkamu.com RESEND_API_KEY=... EMAIL_FROM="Monaplan <halo@domainkamu.com>"
```

Lalu jalankan `supabase/cron.example.sql` (setelah mengganti placeholder) di SQL Editor untuk menjadwalkannya tiap 15 menit.

## Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm run typecheck` | Cek TypeScript |
| `npm run test:db` | Uji migrasi, fungsi akses, dan RLS di PGlite (tanpa Docker) |
| `npm run test:lib` | Uji harga promo, pemetaan event Google, enkripsi token |
| `npm run r2:setup` | Cek koneksi bucket R2 dan pasang aturan CORS |
| `npm run tunnel` | Cloudflare quick tunnel ke localhost:3000 |

## Struktur

```
src/
  app/                     route (lihat PRD 11.3)
    w/[projectId]/         11 modul ruang kerja
    admin/                 panel admin
    api/                   checkout, tebus kode, RSVP, webhook, ekspor, berkas
  components/ui/           komponen dasar sesuai DESIGN.md
  components/app/          shell, kartu status akses, grafik
  features/<modul>/        server actions dan form per modul
  lib/                     supabase, akses/lisensi, format, pembayaran
  content/panduan.ts       konten Panduan Penggunaan
supabase/
  migrations/              SQL dari ERD.md
  functions/send-reminders Edge Function pengingat
  tests/db.test.mjs        uji database
```

## Catatan penyimpangan dari dokumen

- Konten Panduan disimpan sebagai modul TypeScript (`src/content/panduan.ts`), bukan MDX, agar tidak perlu pipeline MDX.
- Impor tamu mendukung CSV dan `.xlsx`. Ekspor memakai CSV (UTF-8 dengan BOM) yang terbuka langsung di Excel.
- Urutan ulang tugas dan rundown memakai tombol naik/turun, dan pipeline vendor mendukung drag and drop bawaan browser (tanpa dnd-kit).
- Ekspor ZIP dokumen (SET-07) dan PDF rundown memakai fitur cetak browser (Simpan sebagai PDF).

## Trial, promo, dan Google Calendar

1. Jalankan migrasi `supabase/migrations/20261009000004_trial_promo_calendar.sql` di SQL Editor (setelah migrasi 1 sampai 3).
2. Admin > Konfigurasi: atur Trial (lama hari, on/off) dan Promo. Harga promo dikirim ke Midtrans sebagai baris diskon.
3. **Google Calendar** (opsional): di Google Cloud buat OAuth Client tipe Web, aktifkan *Google Calendar API*, tambahkan redirect URI `{NEXT_PUBLIC_APP_URL}/api/google/callback`, lalu isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan (opsional) `TOKEN_ENCRYPTION_KEY` di `.env.local`. Selama aplikasi Google berstatus *Testing*, tambahkan email penguji di OAuth consent screen. Scope yang diminta hanya `calendar.app.created`.
4. Uji fungsi murni: `npm run test:lib`. Uji database: `npm run test:db`.
