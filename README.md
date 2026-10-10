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
cp .env.example .env
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
3. Account ID ada di halaman R2 (atau di URL dashboard). Isi di `.env`:

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
3. **Google Calendar** (opsional): di Google Cloud buat OAuth Client tipe Web, aktifkan *Google Calendar API*, tambahkan redirect URI `{NEXT_PUBLIC_APP_URL}/api/google/callback`, lalu isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan (opsional) `TOKEN_ENCRYPTION_KEY` di `.env`. Selama aplikasi Google berstatus *Testing*, tambahkan email penguji di OAuth consent screen. Scope yang diminta hanya `calendar.app.created`.
4. Uji fungsi murni: `npm run test:lib`. Uji database: `npm run test:db`.

## Rute, berkas, email, dan bahasa

- Rute ruang kerja: `/app/<slug>`. Tautan lama `/w/...` dialihkan.
- Berkas: deploy `workers/files` (`wrangler deploy`), pasang route `files.domainmu.com`, isi `FILES_BASE_URL` dan `FILES_SIGNING_SECRET`. Batas 50 MB per pengguna dan 5 MB per berkas.
- Email: verifikasi domain di Resend, isi `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL`, `CRON_SECRET`; pasang cron dari `supabase/cron.example.sql` ke `/api/cron/reminders`. Pratinjau di `/admin/email`.
- Migrasi baru: jalankan `20261009000004` dan `20261009000005` di Supabase SQL Editor.
- Pemeriksaan domain: `npm run check:domain`. Uji: `npm run test:db`, `test:lib`, `test:i18n`.
- Bahasa: kamus Inggris di `src/i18n/en*.ts`; kunci adalah teks sumber Indonesia.

## Promo, RSVP, notifikasi, dan pencarian

- **Kode promo**: dibuat di Admin, Promo. Kode diketik sendiri (3 sampai 32 karakter) dan setiap promo punya periode mulai dan berakhir. Promo tanpa kode berlaku otomatis; promo berkode hanya berlaku bila pengguna memasukkannya di halaman Aktivasi. Promo boleh ditampilkan sebagai popup dari bawah layar (sasaran dan teks diatur admin).
- **Bantuan WhatsApp**: isi `NEXT_PUBLIC_SUPPORT_WHATSAPP` (08xx atau 62xx). Kosong berarti tombol WhatsApp disembunyikan.
- **Undangan digital**: tautan tamu berbentuk `domain/slug-pengantin?to=Nama Tamu`. Nama di `?to=` ditampilkan sebagai sapaan dan dicocokkan ke daftar tamu (huruf besar-kecil dan sapaan diabaikan); nama yang belum ada tercatat sebagai tamu baru bertanda "Mendaftar sendiri" (maksimal 50 per hari per undangan). Alamat proyek yang sama dengan nama rute aplikasi (admin, login, api, dst.) tidak diizinkan. Lima tema gratis (Elegan Minimalis, Klasik Emas, Bali dengan aksara Bali, Noir Luxury, Botanical Soft) dipilih di Pengaturan Pernikahan, tab Undangan RSVP; contohnya di `/rsvp/contoh`.
- **Notifikasi**: konfirmasi RSVP masuk ke lonceng pemilik dan editor lewat Supabase Realtime, dengan polling 45 detik sebagai cadangan.
- **Pencarian**: kotak pencarian di header mencari semua modul (`/api/search`); Ctrl K memfokus kotak.
- Migrasi undangan: jalankan `20261010000002_rsvp_by_name.sql` lalu `20261010000003_rsvp_name_exact.sql` (nama persis dicocokkan dulu, baru nama tanpa sapaan, sehingga "Bapak Budi" dan "Ibu Budi" tidak dianggap kembar) (tema baru, pencocokan nama, pembuangan tabel tiket bantuan dan kolom `rsvp_token`). Statistik sistem di Admin, Sistem memakai `20261010000001_system_stats.sql`.
- Migrasi lama: jalankan `20261009000006_promo_code_rsvp_notify.sql` di Supabase SQL Editor. Bila Realtime belum menyala untuk tabel `notifications`, aktifkan di Database, Replication.
- Header `Content-Security-Policy-Report-Only` aktif; periksa konsol peramban, lalu ganti namanya menjadi `Content-Security-Policy` di `next.config.ts` untuk memberlakukannya.

## Bonus: Rona Impian dan Honeymoon Planner

- **Rona Impian** (`/app/<slug>/rona-impian`): papan ide dekorasi, busana, bunga, venue, makeup, dan katering dengan foto, tautan, warna, dan favorit; palet warna terbentuk dari ide yang disimpan.
- **Honeymoon Planner** (`/app/<slug>/honeymoon-planner`): tujuan, tanggal, anggaran, dan rencana per hari lengkap dengan status sudah dipesan.
- Tabelnya dibuat migrasi `20261009000008_inspiration_trip.sql` (jalankan di Supabase SQL Editor). Nilai bonus di landing diatur di `src/content/bonus.ts` (Rp30.000 dan Rp55.000).
