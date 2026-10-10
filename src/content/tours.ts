import type { TourStep } from "@/components/app/product-tour";

// Isi tur panduan per halaman. Target merujuk atribut data-tour di elemen.
// Langkah yang elemennya tidak terlihat (misal sidebar di HP) otomatis dilewati.
export const TOURS: Record<string, TourStep[]> = {
  dashboard: [
    { target: "nav", title: "Semua modul ada di sini", body: "Pindah antar modul persiapan dari sidebar. Angka merah menandai tugas terlambat, angka plum menandai RSVP baru." },
    { target: "mobile-nav", title: "Menu utama di bawah", body: "Beranda, Checklist, Budget, dan Tamu selalu dekat dengan jempol. Modul lainnya ada di tombol Menu." },
    { target: "countdown", title: "Hitung mundur hari H", body: "Lihat sisa hari menuju pernikahan, lalu tambah tugas atau catat pembayaran langsung dari sini." },
    { target: "kpi", title: "Angka penting sekilas", body: "Budget yang sudah terpakai dibanding total budget, dan jumlah tamu yang sudah konfirmasi hadir." },
    { target: "target", title: "Target persiapan", body: "Pantau progres checklist, pelunasan vendor, dan kelengkapan dokumen. Ikuti Panduan Penggunaan bila bingung harus mulai dari mana." },
    { target: "payments", title: "Jangan sampai telat bayar", body: "Lima pembayaran vendor terdekat beserta statusnya. Yang terlambat ditandai merah." },
    { target: "search", title: "Cari apa saja dengan cepat", body: "Cari tugas, vendor, atau tamu dari halaman mana pun. Tekan Ctrl K untuk langsung mengetik." },
    { target: "help", title: "Butuh tur lagi?", body: "Klik ikon ini kapan saja untuk memutar ulang tur di halaman yang sedang kamu buka." },
  ],
  checklist: [
    { target: "checklist-add", title: "Tambah tugas sendiri", body: "Selain checklist rekomendasi, tambahkan tugas khusus kalian lengkap dengan due date dan penanggung jawab." },
    { target: "checklist-filter", title: "Gunakan filter untuk pencarian yang efektif", body: "Persempit daftar berdasarkan fase, status, penanggung jawab, atau tampilkan yang terlambat saja." },
    { target: "checklist-phase", title: "Dikelompokkan per fase", body: "Tugas dibagi dari lebih dari 12 bulan hingga setelah hari H. Centang untuk menandai selesai, klik judul untuk melihat detail." },
  ],
  budget: [
    { target: "budget-stats", title: "Ringkasan keuangan", body: "Total budget, realisasi, yang sudah dibayar, dan sisa tagihan. Semuanya terhitung otomatis dari item dan pembayaran." },
    { target: "budget-pay", title: "Catat setiap pembayaran", body: "DP, termin, dan pelunasan beserta jatuh temponya. Pengingat dikirim H-7 dan H-1 sebelum jatuh tempo." },
    { target: "budget-tabs", title: "Kategori atau jadwal", body: "Lihat budget per kategori lengkap dengan peringatan bila melebihi alokasi, atau beralih ke daftar jadwal pembayaran." },
  ],
  vendor: [
    { target: "vendor-add", title: "Catat vendor incaran", body: "Simpan kontak, paket, dan harga vendor yang sedang kalian pertimbangkan." },
    { target: "vendor-view", title: "Tabel atau pipeline", body: "Beralih ke tampilan pipeline untuk melihat vendor dari prospek sampai deal. Seret kartu untuk mengubah status." },
  ],
  tamu: [
    { target: "tamu-stats", title: "Rekap RSVP langsung terbarui", body: "Jumlah undangan, total pax, yang hadir, tidak hadir, dan belum merespons." },
    { target: "tamu-actions", title: "Impor, template, dan kirim", body: "Impor daftar tamu dari Excel, atur template pesan WhatsApp, lalu kirim undangan satu per satu secara berurutan." },
    { target: "tamu-filter", title: "Gunakan filter untuk pencarian yang efektif", body: "Persempit daftar berdasarkan grup, pihak, status RSVP, atau yang belum dikirimi undangan." },
    { target: "tamu-send", title: "Kirim undangan via WhatsApp", body: "Pesan berisi link RSVP pribadi tamu langsung terisi. Setelah terkirim, tamu otomatis ditandai sudah dikirimi." },
  ],
  // ---- Halaman ruang kerja lainnya ----
  rundown: [
    { target: "rundown-header", title: "Rundown per acara", body: "Pilih acara di tab, lalu susun kegiatan berurutan lengkap dengan jam, PIC, dan lokasi." },
    { target: "rundown-actions", title: "Unduh PDF formal", body: "PDF siap cetak berisi kop acara, tabel kegiatan bergaris, nomor halaman, dan kolom tanda tangan. Bila ada beberapa acara, tersedia juga PDF semua acara." },
    { target: "rundown-main", title: "Daftar kegiatan", body: "Kegiatan yang jamnya bertabrakan diberi tanda. Urutan di jam yang sama bisa digeser lewat menu titik tiga." },
  ],
  mahar: [
    { target: "mahar-header", title: "Mahar dan seserahan", body: "Catat rencana barang, harga, toko, dan progres pembelian." },
    { target: "mahar-actions", title: "Tambah item", body: "Isi nama, jenis, estimasi harga, dan tautan toko. Foto barang bisa diunggah." },
    { target: "mahar-main", title: "Pantau statusnya", body: "Ubah status dari rencana sampai diterima. Total estimasi dan realisasi dihitung otomatis." },
  ],
  inspirasi: [
    { target: "inspirasi-header", title: "Rona Impian", body: "Kumpulkan ide dekorasi, busana, bunga, venue, dan warna. Tambah foto, tautan sumber, dan catatan di setiap ide." },
    { target: "inspirasi-palette", title: "Palet warna", body: "Warna dari ide-idemu terkumpul di sini. Klik satu warna untuk melihat ide yang cocok." },
    { target: "inspirasi-main", title: "Ide yang terkumpul", body: "Tandai favorit dengan bintang, saring per kategori, dan bagikan ke pasangan lewat satu ruang kerja yang sama." },
  ],
  perjalanan: [
    { target: "perjalanan-header", title: "Honeymoon Planner", body: "Susun perjalanan setelah hari H: tujuan, tanggal, anggaran, dan rencana per hari." },
    { target: "perjalanan-main", title: "Ringkasan perjalanan", body: "Lihat tujuan, durasi, dan berapa hari setelah hari H kalian berangkat. Anggaran dibandingkan dengan biaya yang direncanakan." },
  ],
  dokumen: [
    { target: "dokumen-header", title: "Dokumen penting", body: "Checklist administrasi nikah dan arsip berkas dalam satu halaman." },
    { target: "dokumen-actions", title: "Unggah berkas", body: "Format PDF, JPG, PNG, atau WEBP, maksimal 5 MB per file. Foto dikompres otomatis supaya hemat kuota." },
    { target: "dokumen-main", title: "Checklist dokumen", body: "Centang dokumen yang sudah lengkap dan hubungkan dengan berkas yang diunggah. Kuota 50 MB per akun terlihat di bagian arsip." },
  ],
  kalender: [
    { target: "kalender-header", title: "Satu kalender untuk semua", body: "Tugas, jatuh tempo pembayaran, acara, dan agenda tampil bersama dengan warna berbeda." },
    { target: "kalender-actions", title: "Google Calendar dan agenda", body: "Hubungkan Google Calendar agar jadwal dan pengingatnya muncul di ponselmu. Agenda manual bisa diberi pengingat 1 minggu, 1 hari, 1 jam, atau saat mulai." },
    { target: "kalender-main", title: "Bulan, minggu, atau daftar", body: "Klik dua kali pada sebuah tanggal untuk menambah agenda. Di HP, tampilan daftar dipakai otomatis." },
  ],
  pengaturan: [
    { target: "pengaturan-header", title: "Pengaturan pernikahan", body: "Data pasangan, acara, budget, dan kolaborator diatur dari sini." },
    { target: "pengaturan-main", title: "Pasangan dan alamat ruang kerja", body: "Ubah nama, panggilan, dan alamat ruang kerja (bagian setelah /app/). Alamat lama tetap mengarah ke sini." },
  ],
  panduan: [
    { target: "panduan-header", title: "Panduan penggunaan", body: "Delapan langkah berurutan untuk memulai dari nol." },
    { target: "panduan-main", title: "Selesai otomatis", body: "Setiap langkah tercentang sendiri saat syaratnya terpenuhi, dan tombolnya membawamu ke halaman yang tepat." },
  ],
  "vendor-detail": [
    { target: "vendor-detail-main", title: "Ringkasan vendor", body: "Kontak, status, dan nilai deal. Tandai Deal untuk membuat item budget dan jadwal DP serta pelunasan sekaligus." },
    { target: "vendor-detail-tabs", title: "Paket, pembayaran, dokumen, tugas", body: "Semua yang berkaitan dengan vendor ini ada di tab. Bandingkan paket, catat pembayaran, dan simpan kontrak." },
  ],
  bantuan: [
    { target: "help-faq", title: "Cari jawabannya dulu", body: "Ketik kata kunci atau pilih kategori untuk melihat pertanyaan yang sering diajukan." },
    { target: "help-tours", title: "Putar ulang tur halaman", body: "Pilih halaman mana pun untuk melihat tur singkatnya lagi, atau ulangi semua tur sekaligus." },
    { target: "help-contact", title: "Tidak ketemu jawabannya?", body: "Chat admin lewat WhatsApp. Pesan awalnya sudah terisi, tinggal kirim." },
  ],
  akun: [
    { target: "akun-profil", title: "Profil dan notifikasi", body: "Ubah nama dan nomor WhatsApp, serta atur apakah pengingat dikirim ke email." },
    { target: "akun-lisensi", title: "Lisensi dan upgrade", body: "Lihat status aksesmu. Upgrade ke paket yang lebih tinggi hanya membayar selisih dari yang sudah kamu bayar." },
    { target: "akun-tampilan", title: "Tema dan bahasa", body: "Pilih tema terang, gelap, atau ikuti perangkat." },
  ],
  aktivasi: [
    { target: "aktivasi-plans", title: "Pilih paket", body: "Bayar sekali untuk akses selamanya. Promo yang sedang berlaku dan kredit upgrade sudah dihitung di harga." },
    { target: "aktivasi-promo", title: "Kode promo", body: "Ketik kode promo lalu tekan Terapkan. Harga di kartu paket langsung berubah bila kodenya berlaku." },
    { target: "aktivasi-code", title: "Punya kode akses?", body: "Masukkan kode dari reseller atau promo untuk mengaktifkan akses tanpa membayar." },
  ],

  // ---- Panel admin ----
  admin: [
    { target: "admin-header", title: "Dashboard admin", body: "Grafik pendapatan, pendaftaran, dan status order, plus hal yang perlu ditindaklanjuti. Menu di sidebar mengelompokkan Penjualan, Konfigurasi, dan Pelanggan." },
    { target: "admin-main", title: "Grafik pendapatan", body: "Pendapatan 12 bulan terakhir. Bulan berjalan disorot, dan kartu di atasnya menunjukkan perubahan dibanding bulan lalu." },
  ],
  "admin-paket": [
    { target: "admin-paket-header", title: "Paket dan tingkat", body: "Semua paket berlaku selamanya. Beri tingkat (tier) pada tiap paket: upgrade ke tier lebih tinggi hanya membayar selisih." },
    { target: "admin-paket-actions", title: "Paket baru", body: "Atur harga, batas proyek, kolaborator, dan kuota penyimpanan." },
    { target: "admin-paket-main", title: "Daftar paket", body: "Paket TRIAL hanya pembawa batas untuk masa uji coba. Lamanya diatur di menu Trial." },
  ],
  "admin-trial": [
    { target: "admin-trial-header", title: "Masa uji coba", body: "Akun baru langsung bisa mencoba tanpa membayar bila fitur ini aktif." },
    { target: "admin-trial-main", title: "Saklar dan lama trial", body: "Nyalakan atau matikan trial kapan saja. Lama trial yang diubah berlaku untuk trial berikutnya." },
  ],
  "admin-promo": [
    { target: "admin-promo-header", title: "Promo", body: "Potongan harga otomatis. Harga akhir dihitung di server lalu dikirim ke Midtrans sebagai baris diskon." },
    { target: "admin-promo-actions", title: "Promo baru", body: "Pilih potongan persen atau nominal, paket yang berlaku, dan jendela tanggal." },
    { target: "admin-promo-main", title: "Saklar fitur promo", body: "Mematikan saklar utama menghentikan semua promo sekaligus. Setiap promo juga punya saklar sendiri." },
  ],
  "admin-pengguna": [
    { target: "admin-pengguna-header", title: "Pengguna", body: "Lihat lisensi dan proyek tanpa membuka isi datanya." },
    { target: "admin-pengguna-main", title: "Kelola peran dan akses", body: "Ikon pengguna membuka pengaturan peran, akses selamanya, trial, dan pencabutan. Ikon sampah menghapus akun." },
  ],
  "admin-kode": [
    { target: "admin-kode-header", title: "Kode akses", body: "Buat batch kode untuk reseller, promo, bonus vendor, penjualan offline, atau kompensasi." },
    { target: "admin-kode-main", title: "Daftar batch", body: "Buka batch untuk melihat tiap kode, mengunduh CSV, atau mencabutnya." },
  ],
  "admin-order": [
    { target: "admin-order-header", title: "Order", body: "Semua pembayaran lewat Midtrans, termasuk potongan promo dan kredit upgrade." },
    { target: "admin-order-main", title: "Cek ulang dan tinjau", body: "Cek ulang mengambil status terbaru dari Midtrans. Order bertanda Tinjau perlu perhatianmu." },
  ],
  "admin-lisensi": [
    { target: "admin-lisensi-header", title: "Lisensi", body: "Riwayat akses setiap pengguna: pembayaran, kode akses, trial, atau pemberian admin." },
    { target: "admin-lisensi-main", title: "Perpanjang, cabut, pulihkan", body: "Menu titik tiga mengatur lisensi satu per satu. Pencabutan wajib disertai alasan." },
  ],
  "admin-email": [
    { target: "admin-email-header", title: "Pratinjau email", body: "Lihat semua email yang dikirim Monaplan lewat Resend, dalam Indonesia dan Inggris." },
    { target: "admin-email-main", title: "Kirim contoh ke emailmu", body: "Pilih jenis email di kiri, periksa tampilannya di desktop dan HP, lalu kirim contoh ke kotak masukmu." },
  ],
  "admin-audit": [
    { target: "admin-audit-header", title: "Log audit", body: "Setiap aksi admin tercatat: siapa, kapan, dan apa yang diubah." },
    { target: "admin-audit-main", title: "Jejak lengkap", body: "Gunakan untuk menelusuri perubahan peran, akses, promo, dan pengaturan." },
  ],
};
