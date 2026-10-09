# DESIGN.md Monaplan

Panduan desain aplikasi web Monaplan. Layout mengikuti referensi dashboard (sidebar terang, kartu putih di atas kanvas abu lembut, kartu KPI, grafik batang, tabel), sedangkan identitas visual mengikuti landing page Monaplan: **palet monokromatik plum, serif elegan untuk momen brand, dan sans modern untuk antarmuka.**

Dokumen ini ditulis agar bisa langsung dipakai developer maupun AI coding agent. Semua nilai di sini adalah sumber kebenaran untuk token Tailwind dan shadcn/ui.

---

## 1. Prinsip desain

1. **Tenang, bukan ramai.** Calon pengantin sudah cukup stres. Banyak ruang kosong, satu aksi utama per area, tanpa warna yang saling berebut perhatian.
2. **Angka dulu, detail kemudian.** Setiap halaman dibuka dengan ringkasan (kartu angka), lalu daftar atau tabel di bawahnya.
3. **Satu keluarga warna.** Seluruh UI memakai gradasi plum dan netral bernuansa plum. Status dibedakan dengan ikon, label, dan intensitas warna, bukan dengan warna dari ujung spektrum yang berlawanan.
4. **Mobile setara desktop.** Mayoritas user membuka dari HP. Semua alur utama harus nyaman dengan satu jempol.
5. **Hangat dan personal.** Nama pasangan, hitung mundur, dan sentuhan serif membuat aplikasi terasa milik mereka, bukan sekadar software akuntansi.

---

## 2. Pemetaan referensi ke Monaplan

| Elemen referensi | Versi Monaplan |
|---|---|
| Logo dan nama produk di kiri atas | Logo Monaplan, tombol ciutkan sidebar |
| Grup menu MAIN MENU, FEATURES, GENERAL | MENU UTAMA, PERSIAPAN, UMUM |
| Badge angka di menu (20, 16) | Jumlah tugas terlambat, RSVP baru |
| Kartu "Upgrade Pro" hijau di bawah sidebar | Kartu "Status Akses" bergradasi plum dengan 4 keadaan: Selamanya, Bermasa Aktif, Berakhir, Belum Aktif. Keadaan Bermasa Aktif paling mirip referensi karena berisi ajakan "Upgrade ke Selamanya" |
| Search dengan hint shortcut | Cari tugas, vendor, tamu, dengan hint `Ctrl K` |
| "Welcome back Sajibur Rahman" | "Selamat datang kembali," + nama pasangan dalam serif italic |
| Chip tanggal + tombol hitam Export | Chip tanggal hari ini + tombol plum gelap "Tambah" |
| Kartu Account Balance + tombol Send/Request | Kartu Hitung Mundur + tombol Tambah Tugas dan Catat Pembayaran |
| My Wallet (mini card mata uang) | Progress per Fase (mini card per fase persiapan) |
| Total Expenses, Total Savings | Budget Terpakai, Tamu Hadir |
| Overview bar chart dengan tooltip | Ringkasan Pengeluaran per bulan |
| My Savings Plan (progress target) | Target Persiapan (checklist, pelunasan, dokumen) |
| Recent Transaction (tabel) | Pembayaran Mendatang (tabel) |

---

## 3. Warna

### 3.1 Palet inti

**Plum (brand)**

| Token | Hex | Pemakaian |
|---|---|---|
| `plum-50` | `#FBF5F8` | Latar halaman RSVP, hover sangat halus |
| `plum-100` | `#F6E8EF` | Latar tile ikon, menu aktif, pill status positif |
| `plum-200` | `#EDD1DF` | Batang grafik non-aktif, garis progress kosong bernuansa |
| `plum-300` | `#DFADC5` | Border fokus lembut, ilustrasi |
| `plum-400` | `#C67C9F` | Focus ring, ikon dekoratif |
| `plum-500` | `#A9557E` | Teks link sekunder, grafik |
| `plum-600` | `#8C3A63` | **Warna utama**: tombol primer, menu aktif, batang grafik terpilih, progress |
| `plum-700` | `#722E51` | Hover tombol primer, teks status positif |
| `plum-800` | `#5A2541` | Teks di atas latar plum muda |
| `plum-900` | `#3E1A2D` | Tombol gelap (padanan tombol hitam referensi), kartu status akses |
| `plum-950` | `#26101C` | Gradasi kartu status akses |

**Netral (abu bernuansa plum)**

| Token | Hex | Pemakaian |
|---|---|---|
| `neutral-0` | `#FFFFFF` | Kartu, sidebar, frame aplikasi |
| `neutral-50` | `#FAF8F9` | Header tabel, latar input disabled |
| `neutral-100` | `#F3EFF1` | Kanvas konten, tombol sekunder, mini card |
| `neutral-200` | `#E8E2E5` | Border kartu, divider, border input |
| `neutral-300` | `#D4CCD0` | Border hover, garis grid grafik |
| `neutral-400` | `#A99EA4` | Placeholder, ikon non-aktif |
| `neutral-500` | `#7D7177` | Teks sekunder di atas putih |
| `neutral-600` | `#5E5358` | Teks sekunder di atas `neutral-100` |
| `neutral-700` | `#43393E` | Teks body tebal, ikon menu |
| `neutral-800` | `#2D2529` | Judul kartu |
| `neutral-900` | `#1C1619` | Judul halaman, angka KPI |

### 3.2 Warna semantik

Tetap dalam keluarga plum dan rose agar sesuai prinsip satu keluarga warna. **Setiap status selalu didampingi ikon dan label teks**, sehingga tidak bergantung pada warna.

| Status | Teks | Latar | Ikon (Lucide) | Contoh label |
|---|---|---|---|---|
| Positif | `#722E51` (plum-700) | `#F6E8EF` (plum-100) | `CircleCheck` | Lunas, Hadir, Selesai, Deal |
| Perhatian | `#9A4A2E` (terakota) | `#FBEEE8` | `Clock` | Jatuh tempo 3 hari, Ragu |
| Bahaya | `#B42F4E` (rose) | `#FBEAEE` | `CircleAlert` | Terlambat, Melebihi budget, Tidak hadir |
| Netral | `#5E5358` (neutral-600) | `#F3EFF1` (neutral-100) | `Circle` | Belum dibayar, Belum respon, Rencana |

Semua pasangan teks dan latar di atas lolos kontras WCAG AA untuk teks kecil.

### 3.3 Grafik

- Batang default: gradasi vertikal `plum-200` ke `plum-50`.
- Batang terpilih atau bulan berjalan: gradasi `plum-600` ke `plum-600` dengan opasitas 0, ditambah titik bulat `plum-600` berbingkai putih di puncak, seperti batang Agustus di referensi.
- Perbandingan estimasi dan realisasi: estimasi `plum-200`, realisasi `plum-600`.
- Kategori (donut atau stacked, maksimal 6): `plum-800`, `plum-600`, `plum-500`, `plum-400`, `plum-300`, `plum-200`.
- Garis grid `neutral-200` putus-putus, label sumbu `neutral-500` 12 px.
- Tooltip: kartu putih, border `neutral-200`, bayangan `shadow-pop`, garis kecil `plum-600` di kiri label.

### 3.4 Gradasi yang diizinkan

Hanya untuk kartu Status Akses dan hero halaman aktivasi: `linear-gradient(135deg, #5A2541 0%, #3E1A2D 55%, #26101C 100%)`. Gradasi tidak dipakai untuk tombol atau latar halaman biasa.

---

## 4. Tipografi

| Peran | Font | Alasan |
|---|---|---|
| Display | **Cormorant Garamond** (500, 600, italic 500) | Senada dengan judul landing page, memberi nuansa undangan |
| UI dan angka | **Plus Jakarta Sans** (400, 500, 600, 700) | Modern, mudah dibaca di layar kecil, karya desainer Indonesia |

Angka KPI, nominal uang, dan tabel memakai `font-variant-numeric: tabular-nums` agar digit sejajar.

| Token | Font | Ukuran / line-height | Berat | Pemakaian |
|---|---|---|---|---|
| `display-xl` | Cormorant | 48 / 56 | 500 | Hero landing dan aktivasi |
| `display-lg` | Cormorant | 36 / 44 | 500 | Nama pasangan di RSVP, angka hitung mundur |
| `display-md` | Cormorant italic | 28 / 36 | 500 | Nama pasangan di sapaan dashboard |
| `h1` | Jakarta | 28 / 36 | 600 | Judul halaman |
| `h2` | Jakarta | 20 / 28 | 600 | Judul section |
| `h3` | Jakarta | 16 / 24 | 600 | Judul kartu |
| `kpi` | Jakarta | 32 / 40 | 700 | Angka utama kartu |
| `body` | Jakarta | 14 / 22 | 400 | Teks umum |
| `body-strong` | Jakarta | 14 / 22 | 500 | Item menu, isi tabel penting |
| `small` | Jakarta | 13 / 20 | 400 | Teks sekunder, deskripsi |
| `caption` | Jakarta | 12 / 16 | 500 | Label sumbu, pill, header tabel |
| `overline` | Jakarta | 11 / 16 | 600, uppercase, tracking 0.08em | Label grup sidebar |

Di HP, `h1` turun ke 22 / 30 dan `kpi` ke 28 / 36.

---

## 5. Spacing, radius, border, bayangan

**Spacing** memakai kelipatan 4 px: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

| Konteks | Nilai |
|---|---|
| Jarak antar kartu (gap grid) | 16 |
| Padding kartu | 20 (HP 16) |
| Padding area konten | 24 (HP 16) |
| Jarak judul kartu ke isi | 16 |
| Tinggi baris tabel | 52 |

**Radius**

| Token | Nilai | Pemakaian |
|---|---|---|
| `radius-sm` | 8 | Checkbox, badge kotak, tooltip |
| `radius-md` | 10 | Input, tile ikon, mini card kecil |
| `radius-lg` | 16 | Kartu |
| `radius-xl` | 20 | Panel konten utama |
| `radius-2xl` | 24 | Frame aplikasi |
| `radius-full` | 9999 | Tombol, pill status, chip, avatar, search |

**Border**: 1 px `neutral-200` pada kartu, input, dan tabel. Kartu di referensi hampir tanpa bayangan, jadi Monaplan juga mengandalkan border dan kontras latar.

**Bayangan**

| Token | Nilai | Pemakaian |
|---|---|---|
| `shadow-none` | none | Kartu biasa |
| `shadow-pop` | `0 8px 24px rgba(62, 26, 45, 0.10)` | Dropdown, popover, tooltip grafik |
| `shadow-modal` | `0 24px 64px rgba(62, 26, 45, 0.18)` | Dialog, sheet |

---

## 6. Layout dan shell aplikasi

### 6.1 Breakpoint

| Nama | Lebar | Perilaku |
|---|---|---|
| `mobile` | < 768 | Tanpa sidebar, app bar atas dan bottom navigation |
| `tablet` | 768 sampai 1279 | Sidebar menjadi rail ikon 72 px, bisa dibuka sebagai drawer |
| `desktop` | >= 1280 | Sidebar penuh 248 px |

### 6.2 Struktur desktop

- Latar halaman `neutral-100`. Frame aplikasi putih dengan radius 24 dan margin 16 dari tepi layar.
- Sidebar putih 248 px di dalam frame.
- Top bar tinggi 64 di atas area konten: search (pill, lebar 320), lalu di kanan tombol bantuan, notifikasi, dan avatar dengan nama proyek.
- Area konten berlatar `neutral-100` dengan radius 20, padding 24, lebar maksimal 1440.
- Grid konten 12 kolom, gap 16.

### 6.3 Sidebar

```
Monaplan                    <<

MENU UTAMA
  Dashboard                       LayoutGrid
  To Do Checklist          [4]    ListChecks       (badge: tugas terlambat)
  Budgeting                       Wallet
  Kelola Vendor                   Store
  Tamu & RSVP              [12]   Mail             (badge: RSVP baru)

PERSIAPAN
  Rundown Hari H                  Clock
  Mahar & Seserahan               Gift
  Dokumen Penting                 FileText
  Reminder & Calendar             CalendarDays

UMUM
  Pengaturan Pernikahan           SlidersHorizontal
  Panduan Penggunaan              BookOpen
  Bantuan                         CircleHelp
  Keluar                          LogOut

Bermasa Aktif                   Selamanya
+-----------------------------+ +-----------------------------+
| Akses aktif                 | | (infinity) Akses Selamanya  |
| 214 hari lagi               | | Ajak pasangan atau keluarga |
| [=========-----]            | | ikut merencanakan.          |
| [ Upgrade ke Selamanya ]    | | [ Undang Kolaborator ]      |
| Perpanjang                  | |                             |
+-----------------------------+ +-----------------------------+
```

- Item menu: tinggi 40, radius full, ikon 20 px stroke 1.75, teks `body-strong` `neutral-700`.
- Item aktif: latar `plum-100`, teks dan ikon `plum-700`, ditambah titik 4 px `plum-600` di tepi kiri seperti referensi.
- Badge: pill `neutral-100`, teks `caption` `neutral-600`. Badge terlambat memakai warna Bahaya.
- Kartu Status Akses selalu bergradasi plum gelap dengan teks putih dan satu tombol putih teks `plum-900`. Isinya mengikuti keadaan lisensi owner:

| Keadaan | Ikon | Judul | Isi | Tombol utama | Aksi sekunder (link teks) |
|---|---|---|---|---|---|
| Selamanya | `Infinity` | Akses Selamanya | Ajakan mengajak pasangan atau keluarga | Undang Kolaborator | Tidak ada |
| Bermasa Aktif | `Hourglass` | Akses aktif | Sisa hari dan progress bar sisa masa aktif | Upgrade ke Selamanya | Perpanjang |
| Bermasa Aktif, sisa 14 hari atau kurang | `Hourglass` | Akses segera berakhir | Tanggal berakhir, progress bar warna Perhatian | Perpanjang | Upgrade ke Selamanya |
| Berakhir | `Lock` | Akses berakhir | "Data tetap aman, perpanjang untuk mengedit lagi" | Perpanjang | Upgrade ke Selamanya |
| Belum aktif | `Sparkles` | Aktifkan Akses | "Pilih paket atau masukkan kode akses" | Aktifkan | Tidak ada |

- Kolaborator melihat keadaan yang sama tetapi tanpa tombol bayar, diganti teks "Hubungi pemilik ruang kerja". Tombol Undang Kolaborator disembunyikan untuk kolaborator dan saat kuota kolaborator penuh.

### 6.4 Mobile

```
+--------------------------------+
| (S) Raka & Nadia     (!)  (AV) |   app bar 56
+--------------------------------+
| Selamat datang kembali,        |
| Raka & Nadia                   |
|                                |
| [ Kartu Hitung Mundur       ]  |
| [ KPI ] [ KPI ]  geser ->      |
| [ Target Persiapan          ]  |
| [ Pembayaran Mendatang      ]  |
|   (daftar kartu, bukan tabel)  |
+--------------------------------+
| Beranda Checklist Budget Tamu  |   bottom nav 64
|                       Lainnya  |
+--------------------------------+
```

- Bottom nav 5 item: Beranda, Checklist, Budget, Tamu, Lainnya. "Lainnya" membuka sheet berisi modul sisanya.
- Form tambah dan edit dibuka sebagai bottom sheet (drawer) dengan tombol simpan menempel di bawah.
- Tabel berubah menjadi daftar kartu. Aksi baris pindah ke menu titik tiga.
- Target sentuh minimal 44 x 44.

---

## 7. Dashboard

### 7.1 Header

- Baris 1: "Selamat datang kembali," (`h1` Jakarta, `neutral-900`) diikuti nama pasangan "Raka & Nadia" (`display-md` Cormorant italic, `plum-600`).
- Baris 2: "Pantau semua persiapan menuju hari bahagia kalian." (`small`, `neutral-500`).
- Kanan: chip tanggal hari ini (ikon `Calendar`, pill putih border `neutral-200`), dan tombol gelap `plum-900` "Tambah" dengan menu: Tugas, Pembayaran, Tamu, Agenda.

### 7.2 Grid desktop

```
+------------------------------+  +---------------------+  +---------------------+
| Hitung Mundur           ...  |  | Budget Terpakai ... |  | Tamu Hadir      ... |
| 127 hari lagi                |  | Rp 86.400.000       |  | 214 orang           |
| Sab, 13 Feb 2027, Bandung    |  | (62%) dari budget   |  | (+18) minggu ini    |
| [+ Tambah Tugas] [Catat Bayar]  +---------------------+  +---------------------+
|                              |  +----------------------------------------------+
| Progress per Fase    [Semua] |  | Ringkasan Pengeluaran   [Realisasi] [2026 v] |
| +-----------+ +-----------+  |  |                                              |
| | 12-6 bln  | | 6-3 bln   |  |  |   bar chart 12 bulan, bulan berjalan disorot |
| | 92%       | | 48%       |  |  |                                              |
| +-----------+ +-----------+  |  |                                              |
| | 3-1 bln   | | 1 bln     |  |  |                                              |
| | 10%       | | 0%        |  |  |                                              |
| +-----------+ +-----------+  |  |                                              |
+------------------------------+  +----------------------------------------------+
+------------------------------+  +----------------------------------------------+
| Target Persiapan        ...  |  | Pembayaran Mendatang               [Filter]  |
| Checklist      48/78    62%  |  | Vendor     | Jatuh tempo | Nominal | Status  |
| Pelunasan       3/8     38%  |  | Katering   | 16 Okt 2026 | Rp 15jt | 7 hari  |
| Dokumen        7/11     64%  |  | Dekorasi   | 2 Nov 2026  | Rp 8jt  | Belum   |
+------------------------------+  +----------------------------------------------+
```

| Area | Kolom desktop | Isi |
|---|---|---|
| Hitung Mundur | 1 sampai 5, dua baris | Angka hari (`display-lg` Cormorant), tanggal dan lokasi acara utama, dua tombol, lalu Progress per Fase 2 x 2 |
| Budget Terpakai | 6 sampai 9 | Realisasi, pill persentase terhadap total budget, teks "dari total budget" |
| Tamu Hadir | 10 sampai 12 | Pax hadir, pill perubahan 7 hari terakhir |
| Ringkasan Pengeluaran | 6 sampai 12 | Grafik batang per bulan, toggle Realisasi atau Estimasi, pilihan tahun |
| Target Persiapan | 1 sampai 5 | 3 baris progress dengan tile ikon, angka dan persen |
| Pembayaran Mendatang | 6 sampai 12 | Tabel 5 pembayaran terdekat, tombol filter |
| Agenda 14 Hari | 1 sampai 12 (baris berikutnya) | Daftar horizontal per hari, item bertile ikon sesuai sumber |

Tombol utama di kartu Hitung Mundur meniru pasangan Send Money dan Request Money: kiri tombol primer `plum-600` dengan ikon, kanan tombol sekunder `neutral-100`.

---

## 8. Komponen

### 8.1 Tombol

| Varian | Latar | Teks | Hover | Pemakaian |
|---|---|---|---|---|
| Primary | `plum-600` | putih | `plum-700` | Aksi utama per area |
| Dark | `plum-900` | putih | `plum-800` | Aksi global di header halaman |
| Secondary | `neutral-100` | `neutral-800` | `neutral-200` | Aksi pendamping |
| Outline | putih, border `neutral-200` | `neutral-800` | latar `neutral-50` | Filter, chip tanggal |
| Ghost | transparan | `neutral-700` | latar `neutral-100` | Ikon di top bar, titik tiga |
| Danger | `#B42F4E` | putih | lebih gelap 8% | Hapus, cabut akses |

Ukuran: `sm` 32, `md` 40, `lg` 48 (tombol utama di HP). Semua radius full, ikon 18 px di kiri, jarak ikon ke teks 8. Status loading mengganti ikon dengan spinner dan menonaktifkan tombol.

### 8.2 Kartu

- Putih, border `neutral-200`, radius 16, padding 20.
- Header kartu: tile ikon 36 x 36 (radius 10, border `neutral-200`, ikon 18 `neutral-700`), judul `h3`, aksi titik tiga (ghost 32 x 32, latar `neutral-100`) di kanan.
- **Stat card**: header, angka `kpi`, lalu baris pill perubahan plus teks `small` "dari bulan lalu" atau sejenisnya.
- **Mini card** (Progress per Fase): latar `neutral-100`, radius 12, padding 12, label `caption`, angka `h3`, status kecil di bawah.

### 8.3 Pill dan badge

- Tinggi 22, padding horizontal 8, radius full, teks `caption`, ikon 12 opsional.
- Pill perubahan angka: naik memakai warna Positif dengan ikon `ArrowUp`, turun memakai Bahaya dengan `ArrowDown`. Untuk budget, kenaikan pengeluaran yang melewati alokasi memakai Bahaya.

### 8.4 Input dan form

- Tinggi 40, radius 10, border `neutral-200`, latar putih, teks `body`.
- Fokus: border `plum-400` dan ring 3 px `plum-100`.
- Error: border `#B42F4E`, pesan `small` di bawah dengan ikon `CircleAlert`.
- Label di atas input, `body-strong` `neutral-800`. Teks bantuan `small` `neutral-500`.
- Input Rupiah: prefix "Rp" di dalam input, format ribuan otomatis, keyboard numerik di HP.
- Input nomor WhatsApp: prefix "+62", menerima `08xx` lalu dinormalisasi.
- Input kode akses: satu field dengan mask `MNP-XXXX-XXXX-XXXX`, huruf besar otomatis, font tabular, bisa paste.
- Search: pill latar `neutral-50`, ikon `Search`, hint `Ctrl K` dalam kotak `kbd` kecil di kanan.

### 8.5 Tabel

- Header: latar `neutral-50`, radius 10 di sudut, teks `caption` `neutral-500`.
- Baris: tinggi 52, divider `neutral-200`, hover latar `plum-50`.
- Kolom pertama sering berisi tile ikon 28 px + teks `body-strong`.
- Kolom nominal rata kanan, tabular.
- Status dengan pill semantik, aksi titik tiga di ujung.
- Seleksi baris dengan checkbox untuk aksi massal. Bar aksi massal muncul menempel di bawah.

### 8.6 Progress

- Bar: tinggi 8, radius full, track `plum-100`, isi `plum-600`. Lebih dari 100% (budget) berubah ke warna Bahaya.
- Baris target: tile ikon, judul, angka "48/78", persen rata kanan di atas bar.

### 8.7 Komponen lain

| Komponen | Spesifikasi |
|---|---|
| Tabs atau segmented | Kontainer `neutral-100` radius full, item aktif putih dengan border `neutral-200` |
| Dropdown dan popover | Putih, radius 12, `shadow-pop`, item tinggi 36 |
| Dialog | Lebar 480 atau 640, radius 20, `shadow-modal`, overlay `rgba(28, 22, 25, 0.4)` |
| Sheet samping | Lebar 480 di desktop untuk detail tugas, vendor, tamu |
| Toast | Kiri bawah di desktop, atas di HP, ikon semantik, auto tutup 4 detik |
| Avatar | Bulat, 32 di top bar, 24 di daftar, fallback inisial di latar `plum-100` teks `plum-700` |
| Empty state | Ilustrasi garis plum sederhana, judul `h3`, satu kalimat, satu tombol primer |
| Skeleton | Blok `neutral-100` dengan shimmer halus, bentuk mengikuti konten asli |
| Banner read-only | Menempel di atas konten, latar `plum-100`, ikon `Lock`. Dua varian: masa aktif berakhir (tombol "Perpanjang" dan link "Upgrade ke Selamanya") dan akses dicabut (tombol "Hubungi Bantuan") |
| Tur panduan (coachmark) | Elemen bertanda `data-tour` disorot dengan ring 2 px `plum-300` dan sisa layar digelapkan `rgba(28, 22, 25, 0.55)`. Kartu putih radius 16, `shadow-modal`, judul 17 px semibold, isi 13,5 px `neutral-600`, penanda langkah "3 / 4" di kanan atas, titik progres di bawah. Tombol: "Lewati" (teks), kembali (ikon bulat), "Lanjut" atau "Oke, mengerti" (primary). Kartu diletakkan di bawah, atas, atau samping elemen sesuai ruang; di HP menjadi lembar di bawah layar. Muncul otomatis sekali per halaman, bisa diputar ulang lewat ikon bantuan di top bar. Isi tur ada di `src/content/tours.ts` |
| Dialog konfirmasi dan isian | Pengganti `window.confirm` dan `window.prompt` (`useConfirm`, `usePrompt`). Tile ikon 40 px (bahaya: `danger-bg`), judul 17 px semibold, isi 13,5 px. Tombol di footer modal; nuansa bahaya memakai tombol Danger dengan label aksi ("Hapus", "Cabut Lisensi"). Dialog bawaan browser tidak boleh dipakai |
| Struktur modal | Header (padding 24 sampai 28), isi yang bisa digulir, footer tombol terpisah berlatar `neutral-50` sehingga tombol tidak menimpa isian. Di HP: bottom sheet, tombol lebar penuh bertumpuk dengan aksi utama di atas. Escape dan Tab hanya berlaku untuk modal teratas, fokus dikembalikan ke pemicu saat ditutup |

---

## 9. Pola halaman per modul

| Modul | Struktur |
|---|---|
| Pengaturan Pernikahan | Tabs: Pasangan, Acara, Budget dan Tamu, Kolaborator, Lainnya. Acara tampil sebagai daftar kartu yang bisa diurutkan. Area berbahaya (arsip, hapus) di paling bawah dengan border Bahaya |
| Panduan Penggunaan | Stepper vertikal. Tiap langkah: nomor dalam lingkaran (selesai berubah menjadi centang `plum-600`), judul, penjelasan, tombol menuju modul. Progress keseluruhan di atas |
| To Do Checklist | Header: progress bar keseluruhan, filter (fase, status, PIC), search, tombol Tambah. Isi: grup per fase yang bisa dilipat, tiap baris checkbox, judul, chip due date, avatar PIC, titik tiga. Klik baris membuka sheet detail |
| Budgeting | 4 stat card (Total Budget, Realisasi, Sudah Dibayar, Sisa Tagihan), grafik estimasi dan realisasi per kategori, lalu tabs: Kategori (tabel bisa dibuka per kategori) dan Jadwal Pembayaran |
| Kelola Vendor | Segmented Tabel atau Pipeline. Pipeline: 5 kolom status, kartu vendor dengan kategori, nama, harga paket terpilih, tombol WhatsApp. Detail vendor: header info, tabs Paket, Pembayaran, Dokumen, Tugas |
| Tamu & RSVP | 5 stat card ringkas (Undangan, Pax, Hadir, Tidak Hadir, Belum Respon), toolbar (filter grup, pihak, status, sudah dikirim, impor, template pesan), tabel tamu dengan tombol "Kirim WA" per baris, tab Ucapan |
| Template pesan | Dua kolom: editor dengan chip placeholder yang bisa diklik, dan pratinjau gelembung chat bernuansa netral |
| Rundown Hari H | Tabs per acara. Timeline vertikal: kolom jam di kiri (tabular), kartu kegiatan di kanan dengan PIC dan lokasi. Item bertabrakan diberi border Perhatian. Tombol Cetak |
| Mahar & Seserahan | Tabs Mahar dan Seserahan, ringkasan total dan progres, grid kartu item (foto 4:3, nama, harga, pill status, tombol buka link toko) |
| Dokumen Penting | Section 1: checklist administrasi dua kolom (pria dan wanita). Section 2: arsip file dengan filter kategori, tampilan grid atau daftar, dropzone unggah |
| Reminder & Calendar | Desktop default tampilan bulan, HP default daftar agenda. Item dibedakan dengan ikon sumber (tugas `ListChecks`, pembayaran `Wallet`, acara `Heart`, agenda `CalendarDays`) dan intensitas plum, bukan warna berbeda |
| Akun | Kartu profil, kartu lisensi (jenis paket, label "Selamanya" atau tanggal berakhir dan sisa hari, sumber aktivasi, tombol Perpanjang atau Upgrade bila relevan), tabel tagihan dengan unduh kuitansi |

### 9.1 Halaman aktivasi

- Latar `plum-50`, tanpa sidebar. Logo di atas, judul `display-lg` "Satu langkah lagi menuju persiapan yang tenang."
- Baris paket: dua kartu paket berdampingan (menumpuk di HP, kartu Selamanya di atas).
  - **Bermasa Aktif**: kartu putih border `neutral-200`. Nama paket, harga (`kpi`), label "aktif 12 bulan, bisa diperpanjang" (`small`, `neutral-600`), daftar fitur dengan ikon centang `plum-600`, tombol Secondary lebar penuh "Pilih Paket Ini".
  - **Selamanya**: kartu putih border 2 px `plum-600`, pill "Paling hemat jangka panjang" (latar `plum-100`, teks `plum-700`) di pojok atas. Nama paket, harga (`kpi`), label "sekali bayar, akses selamanya" (`small`, `plum-700`), daftar fitur yang sama, tombol Primary lebar penuh "Pilih Paket Ini".
  - Fitur kedua paket identik. Pembeda hanya masa aktif, sehingga perbandingan cukup satu baris "Masa aktif: 12 bulan" lawan "Masa aktif: Selamanya".
- Di bawahnya, kartu lebar **Punya Kode Akses?**: input kode, tombol "Aktifkan", teks bantuan "Kode didapat dari reseller atau promo Monaplan." Setelah kode valid, tampil konfirmasi paket yang didapat (Selamanya atau berapa bulan).
- Logo metode bayar dalam grayscale di bawah kartu paket.
- Halaman yang sama dipakai untuk perpanjangan dan upgrade. Pemilik paket bermasa aktif melihat judul "Perpanjang atau upgrade akses", tanggal berakhir saat ini, dan keterangan tanggal berakhir baru di kartu Bermasa Aktif ("Aktif sampai 9 Okt 2028"). Pemilik akses Selamanya diarahkan ke halaman Akun.
- Footer kecil: tautan bantuan dan kebijakan privasi.

### 9.2 Halaman RSVP tamu

- Mobile-first, lebar konten maksimal 480, latar `plum-50`.
- Foto sampul (rasio 4:5, radius 24), lalu "The Wedding of" (`overline`) dan nama pasangan `display-lg` Cormorant.
- Sapaan personal "Halo, Bapak Hendra" (`h2`).
- Kartu per acara: nama acara, tanggal, jam, tempat, tombol "Buka Maps".
- Form: tiga pilihan besar sebagai kartu yang bisa dipilih (Hadir, Tidak Hadir, Masih Ragu), stepper jumlah orang, textarea ucapan, tombol primer "Kirim Konfirmasi".
- Setelah kirim: pesan terima kasih dengan ilustrasi sederhana dan tombol "Ubah jawaban".

---

## 10. Format data

| Data | Format | Contoh |
|---|---|---|
| Uang | `Rp` + spasi + titik ribuan | Rp 12.500.000 |
| Uang ringkas (grafik, kartu kecil) | jt atau rb | Rp 12,5 jt |
| Tanggal pendek | Hari 3 huruf, tanggal, bulan 3 huruf, tahun | Sab, 13 Feb 2027 |
| Tanggal panjang | | Sabtu, 13 Februari 2027 |
| Jam | 24 jam dengan titik | 08.30 WIB |
| Relatif | | 3 hari lagi, kemarin, terlambat 2 hari |
| Persen | Tanpa desimal kecuali < 10 | 62%, 4,5% |
| Nomor HP | Tampil berkelompok | +62 812 3456 7890 |

---

## 11. Gerak

- Durasi 150 ms untuk hover dan fokus, 200 ms untuk dropdown, 250 ms untuk sheet dan dialog.
- Easing `cubic-bezier(0.2, 0, 0, 1)`.
- Centang tugas: checkbox mengisi dengan sedikit skala (0.9 ke 1), baris memudar ke status selesai.
- Angka KPI berganti dengan animasi hitung singkat (maksimal 400 ms).
- Hormati `prefers-reduced-motion`: matikan animasi non-esensial.

---

## 12. Aksesibilitas

- Kontras teks minimal 4.5:1. Teks sekunder di atas `neutral-100` memakai `neutral-600`, bukan `neutral-500`.
- Focus ring terlihat di semua elemen interaktif: 2 px `plum-400` dengan offset 2 px.
- Status tidak hanya disampaikan lewat warna: selalu ada ikon dan label.
- Ikon-only button punya `aria-label`.
- Grafik punya ringkasan teks dan tabel alternatif untuk pembaca layar.
- Semua form bisa diselesaikan dengan keyboard, urutan tab logis.

---

## 13. Tone dan microcopy

- Bahasa Indonesia santai dan sopan, sapaan "kamu" untuk user dan "kalian" saat merujuk pasangan.
- Kalimat pendek, kata kerja di depan untuk tombol: "Tambah Tugas", "Catat Pembayaran", "Kirim via WhatsApp".
- Hindari istilah teknis di pesan error. Selalu beri jalan keluar.

### 13.1 Pesan error kode akses

| Kode error | Pesan |
|---|---|
| `CODE_INVALID_FORMAT` | Format kode belum pas. Contoh: MNP-7K2M-9QXR-4HTP. |
| `CODE_NOT_FOUND` | Kode tidak ditemukan. Cek lagi huruf dan angkanya, ya. |
| `CODE_ALREADY_USED` | Kode ini sudah dipakai. Hubungi penjual kode bila kamu merasa belum menggunakannya. |
| `CODE_ALREADY_REDEEMED_BY_USER` | Kamu sudah pernah memakai kode ini. |
| `CODE_EXPIRED` | Kode ini sudah melewati masa berlakunya. |
| `CODE_REVOKED` | Kode ini sudah tidak aktif. |
| `ALREADY_LIFETIME` | Akunmu sudah punya akses selamanya, jadi kode ini tidak diperlukan. |
| `RATE_LIMITED` | Terlalu banyak percobaan. Coba lagi dalam {menit} menit. |

### 13.2 Empty state

| Modul | Judul | Teks | Tombol |
|---|---|---|---|
| Checklist | Belum ada tugas | Mulai dari checklist rekomendasi, lalu sesuaikan dengan rencana kalian. | Pakai Checklist Rekomendasi |
| Vendor | Belum ada vendor | Catat vendor yang sedang kamu lirik supaya mudah dibandingkan. | Tambah Vendor |
| Tamu | Daftar tamu masih kosong | Tambahkan satu per satu atau impor dari Excel. | Impor Tamu |
| Mahar | Belum ada item mahar | Catat rencana mahar beserta harga dan link tokonya. | Tambah Item |
| Dokumen | Belum ada dokumen | Simpan berkas penting di satu tempat yang aman. | Unggah Dokumen |

### 13.3 Banner akses

| Varian | Teks | Aksi |
|---|---|---|
| Masa aktif berakhir | "Akses kalian berakhir pada 9 Okt 2027. Data tetap aman dan bisa diekspor. Perpanjang untuk kembali mengedit." | Tombol "Perpanjang", link "Upgrade ke Selamanya" |
| Akses dicabut | "Akses ruang kerja ini sedang tidak aktif. Data tetap aman dan bisa diekspor. Hubungi kami bila menurutmu ini keliru." | Tombol "Hubungi Bantuan" |
| Kolaborator, akses owner berakhir | "Akses ruang kerja ini sudah berakhir. Minta pemilik ruang kerja untuk memperpanjang." | Tidak ada |

### 13.4 Konfirmasi aktivasi

| Situasi | Pesan |
|---|---|
| Aktivasi Selamanya | "Akses selamanya sudah aktif. Selamat merencanakan!" |
| Aktivasi Bermasa Aktif | "Akses aktif sampai {tanggal}." |
| Perpanjangan | "Masa aktif diperpanjang sampai {tanggal}. Sisa hari sebelumnya tetap terhitung." |
| Upgrade | "Sekarang akses kalian berlaku selamanya." |

---

## 14. Implementasi

### 14.1 Font (Next.js)

```ts
// src/app/fonts.ts
import { Plus_Jakarta_Sans, Cormorant_Garamond } from "next/font/google";

export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
```

```tsx
// src/app/layout.tsx
<html lang="id" className={`${jakarta.variable} ${cormorant.variable}`}>
```

### 14.2 Token (Tailwind CSS v4 + shadcn/ui)

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-plum-50:  #FBF5F8;
  --color-plum-100: #F6E8EF;
  --color-plum-200: #EDD1DF;
  --color-plum-300: #DFADC5;
  --color-plum-400: #C67C9F;
  --color-plum-500: #A9557E;
  --color-plum-600: #8C3A63;
  --color-plum-700: #722E51;
  --color-plum-800: #5A2541;
  --color-plum-900: #3E1A2D;
  --color-plum-950: #26101C;

  --color-neutral-0:   #FFFFFF;
  --color-neutral-50:  #FAF8F9;
  --color-neutral-100: #F3EFF1;
  --color-neutral-200: #E8E2E5;
  --color-neutral-300: #D4CCD0;
  --color-neutral-400: #A99EA4;
  --color-neutral-500: #7D7177;
  --color-neutral-600: #5E5358;
  --color-neutral-700: #43393E;
  --color-neutral-800: #2D2529;
  --color-neutral-900: #1C1619;

  --color-positive:     #722E51;
  --color-positive-bg:  #F6E8EF;
  --color-caution:      #9A4A2E;
  --color-caution-bg:   #FBEEE8;
  --color-danger:       #B42F4E;
  --color-danger-bg:    #FBEAEE;

  --font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-cormorant), ui-serif, Georgia, serif;

  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;

  --shadow-pop: 0 8px 24px rgba(62, 26, 45, 0.10);
  --shadow-modal: 0 24px 64px rgba(62, 26, 45, 0.18);
}

/* Variabel semantik shadcn/ui */
:root {
  --radius: 1rem;
  --background: #F3EFF1;
  --foreground: #1C1619;
  --card: #FFFFFF;
  --card-foreground: #1C1619;
  --popover: #FFFFFF;
  --popover-foreground: #1C1619;
  --primary: #8C3A63;
  --primary-foreground: #FFFFFF;
  --secondary: #F3EFF1;
  --secondary-foreground: #2D2529;
  --muted: #FAF8F9;
  --muted-foreground: #5E5358;
  --accent: #F6E8EF;
  --accent-foreground: #5A2541;
  --destructive: #B42F4E;
  --border: #E8E2E5;
  --input: #E8E2E5;
  --ring: #C67C9F;
  --chart-1: #8C3A63;
  --chart-2: #A9557E;
  --chart-3: #C67C9F;
  --chart-4: #DFADC5;
  --chart-5: #5A2541;
  --sidebar: #FFFFFF;
  --sidebar-foreground: #43393E;
  --sidebar-primary: #8C3A63;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #F6E8EF;
  --sidebar-accent-foreground: #722E51;
  --sidebar-border: #E8E2E5;
  --sidebar-ring: #C67C9F;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

.tabular { font-variant-numeric: tabular-nums; }
```

Mode gelap sudah tersedia. Kelas `.dark` di `<html>` dipasang skrip kecil di `<head>` sebelum render (tanpa kedipan), lalu blok `.dark { ... }` di `globals.css` memetakan ulang token: skala `neutral` dibalik, skala `plum` digeser ke nuansa gelap, plus token `surface` (kartu, modal, sidebar), `canvas` (latar halaman), dan `danger-solid` (tombol bahaya). Komponen memakai token, bukan warna literal, sehingga tidak perlu kelas `dark:` di tiap komponen. Pengguna memilih Terang, Gelap, atau Sistem lewat menu akun, halaman Akun, atau tombol cepat di top bar. Pilihan disimpan di `localStorage` (`mp-theme`).

### 14.3 Komponen domain yang perlu dibuat

| Komponen | Isi |
|---|---|
| `AppShell` | Frame, sidebar, top bar, bottom nav untuk HP |
| `AccessStatusCard` | Kartu status akses di sidebar |
| `PageHeader` | Judul, deskripsi, chip tanggal, aksi |
| `StatCard` | Tile ikon, judul, angka, pill perubahan, menu |
| `ProgressRow` | Baris target dengan progress bar |
| `StatusPill` | Varian positif, perhatian, bahaya, netral dengan ikon |
| `CurrencyInput`, `PhoneInput`, `AccessCodeInput` | Input khusus dengan format otomatis |
| `DataTable` | Tabel shadcn + TanStack Table dengan seleksi dan versi kartu di HP |
| `EmptyState`, `ReadOnlyBanner` | Pola status halaman |
| `CountdownCard`, `SpendingChart` | Komponen dashboard |

---

## 15. Do dan don't

| Do | Don't |
|---|---|
| Pakai `plum-600` untuk satu aksi utama per area | Menaruh dua tombol primer berdampingan |
| Bedakan status dengan ikon dan label | Mengandalkan hijau dan merah untuk membedakan status |
| Pakai Cormorant hanya untuk nama pasangan, hitung mundur, dan halaman brand | Memakai serif untuk tabel, form, atau teks panjang |
| Biarkan kartu bernapas dengan padding 20 | Menumpuk lebih dari 3 kartu KPI dalam satu baris di desktop |
| Format uang dan tanggal secara konsisten lewat helper | Menulis format manual di tiap komponen |
| Tampilkan daftar kartu di HP | Memaksa tabel lebar dengan scroll horizontal di HP |

## 16. Revisi: mobile, auth, saklar

### 16.1 Navigasi mobile
Di bawah 768 px: bilah tab menempel di dasar layar (tinggi 60 px + safe area), 4 tab + Menu, tab aktif berlatar pil plum. Menu membuka bottom sheet (animasi naik, pegangan, avatar di kepala, grid ikon 4 kolom per grup, kartu akses, pilihan tema, Keluar), menutup dengan Escape atau ketukan di latar, dan mengunci gulir halaman. Header mobile hanya judul halaman + aksi (bantuan, notifikasi). Konten memberi ruang bawah `calc(5.5rem + env(safe-area-inset-bottom))`; viewport memakai `viewport-fit=cover`.

### 16.2 Halaman auth
Panel merek di kiri `sticky` setinggi layar sehingga identik pada Masuk, Daftar, dan Lupa password. Judul dan tab di kolom kanan berada pada posisi tetap; subjudul memesan tinggi dua baris agar tidak melompat saat berganti mode.

### 16.3 Switch
`Switch` (role=switch) untuk pengaturan yang langsung berlaku (trial, promo, sinkron otomatis). Aktif plum-600, nonaktif neutral-300, knob putih.

### 16.4 Halaman fokus
Aktivasi dan onboarding memakai `FocusHeader` (logo kiri, Keluar kanan).

## 17. Revisi gelombang B: animasi dan bahasa

- Animasi hanya `transform` dan `opacity`, 150 sampai 250 ms: transisi halaman (`template.tsx`), stagger kartu, hover-lift, tekan tombol, shimmer skeleton, bilah progres, hitung naik KPI. Semuanya mati pada `prefers-reduced-motion`.
- Pengalih bahasa ID/EN ada di landing, halaman auth, menu pengguna, bottom sheet, dan Akun. Teks Inggris biasanya lebih pendek; layout tidak boleh bergantung pada panjang teks Indonesia.
- Teks antarmuka dibuat singkat: tanpa slogan dan tanpa kalimat yang mengulang label.
