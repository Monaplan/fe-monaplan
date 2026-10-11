<div align="center">

<img src="brand/monaplan-logo-horizontal.png" alt="Monaplan" width="360" />

### Satu tempat untuk semua rencana nikahmu

Aplikasi web wedding planner all-in-one: checklist, budget, vendor, tamu dan RSVP, rundown hari H, sampai dokumen pernikahan.

[![Demo](https://img.shields.io/badge/Demo-monaplan.vercel.app-8C3A63?style=for-the-badge&logo=vercel&logoColor=white)](https://monaplan.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare_R2_+_Turnstile-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![Midtrans](https://img.shields.io/badge/Midtrans-002855?style=flat-square&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

## Tampilan

<div align="center">
<img src="docs/screenshots/landing.png" alt="Halaman utama Monaplan" width="880" />
</div>

<br />

<table>
  <tr>
    <td width="62%"><img src="docs/screenshots/app-dashboard.png" alt="Dashboard" /></td>
    <td width="38%"><img src="docs/screenshots/undangan.png" alt="Undangan digital tema Bali" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Dashboard: hitung mundur, budget, tamu, dan progres persiapan</sub></td>
    <td align="center"><sub>Undangan digital dengan lima tema</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/app-checklist.png" alt="Checklist" /></td>
    <td><img src="docs/screenshots/landing-mobile.png" alt="Tampilan di ponsel" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Checklist berfase dengan tenggat otomatis</sub></td>
    <td align="center"><sub>Responsif di ponsel</sub></td>
  </tr>
</table>

## Fitur

**Untuk pengantin**

| | |
|---|---|
| ✅ **Checklist** | Tugas persiapan berfase, tenggatnya dihitung dari tanggal pernikahan. Template Umum dan adat Jawa, Sunda, Bali, Minang, Batak. |
| 💰 **Budgeting** | Anggaran per kategori, jadwal pembayaran, dan ringkasan pengeluaran. |
| 🏪 **Vendor** | Pantau status negosiasi, DP, dan pelunasan. |
| 💌 **Tamu & RSVP** | Daftar tamu, undangan lewat WhatsApp, dan konfirmasi kehadiran. |
| 🎴 **Undangan digital** | Tautan sendiri per pasangan dan per nama tamu, dengan lima tema. |
| 🕒 **Rundown & Kalender** | Rundown hari H dan sinkronisasi Google Calendar. |
| 📄 **Dokumen** | Berkas penting dan persyaratan KUA. |
| 🎁 **Mahar & Seserahan** | Rencana, harga, dan status pembelian. |
| 🎨 **Rona Impian & Honeymoon** | Papan inspirasi dan perencana bulan madu. |
| 🤝 **Kolaborasi** | Ajak pasangan atau keluarga dengan peran pemilik, editor, atau pembaca. |

**Untuk pengelola**

- Panel admin: pengguna, order dan lisensi, paket, promo, kode akses, trial, audit, dan ringkasan kondisi sistem.
- Pembayaran online, kode promo, dan kode akses dari reseller.

Tersedia dalam **bahasa Indonesia dan Inggris**, dengan **mode terang dan gelap**.

## Tech stack

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Tampilan | Tailwind CSS v4, Lucide, Recharts |
| Database dan autentikasi | Supabase: PostgreSQL dengan Row Level Security, Auth, Realtime |
| Penyimpanan berkas | Cloudflare R2 |
| Pembayaran | Midtrans Snap |
| Email | Resend |
| Keamanan | Cloudflare Turnstile, Content Security Policy, validasi dengan Zod |
| Integrasi | Google OAuth dan Google Calendar |
| Hosting dan pemantauan | Vercel (Analytics dan Speed Insights) |
| Pengujian | Uji database dengan PGlite, uji pustaka dan terjemahan dengan skrip Node |

## Struktur singkat

```
src/app          Halaman dan rute (aplikasi, admin, undangan publik, API)
src/components   Komponen UI, landing, dan undangan
src/features     Server Actions per modul
src/lib          Akses data, helper, dan integrasi
src/content      Konten statis: tema undangan, tur, bantuan, pilihan adat
src/i18n         Kamus terjemahan
supabase         Migrasi SQL dan uji database
```

## Skrip

```bash
npm run dev         # server pengembangan
npm run build       # build produksi
npm run typecheck   # pemeriksaan tipe
npm run test:db     # uji skema dan aturan akses database
npm run test:lib    # uji fungsi pustaka
npm run test:i18n   # uji kelengkapan terjemahan
```
