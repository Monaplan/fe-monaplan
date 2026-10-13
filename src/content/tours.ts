import type { TourStep } from "@/components/app/product-tour";

// Isi tur panduan per halaman. Target merujuk atribut data-tour di elemen.
// Langkah yang elemennya tidak terlihat (misal sidebar di HP) otomatis dilewati.
export const TOURS: Record<string, TourStep[]> = {
  dashboard: [
    { target: "nav", title: "Semua modul ada di sini", body: "Sidebar dibagi per grup: Menu utama, Persiapan, Hari H, Bonus, dan Umum. Klik judul grup untuk membuka atau menutupnya. Angka merah menandai tugas terlambat, angka plum menandai RSVP baru." },
    { target: "mobile-nav", title: "Menu utama di bawah", body: "Beranda, Checklist, Budget, dan Tamu selalu dekat dengan jempol. Modul lainnya, akun, tema, dan bahasa ada di tombol Menu. Geser lembar menu ke bawah untuk menutupnya." },
    { target: "quickadd", title: "Tambah cepat dari mana saja", body: "Tombol Tambah membuka form tugas, pembayaran, atau agenda tanpa pindah halaman. Sambungkan Google Calendar dulu agar pengingatnya muncul di HP." },
    { target: "countdown", title: "Hitung mundur hari H", body: "Cincin menunjukkan seberapa jauh perjalanan sejak ruang kerja dibuat sampai hari H, lengkap dengan sisa bulan, minggu, dan hari. Tanggal dan lokasi diambil dari Pengaturan." },
    { target: "kpi", title: "Angka penting sekilas", body: "Budget yang sudah terpakai dibanding total budget, dan jumlah tamu yang sudah konfirmasi hadir beserta tambahan minggu ini." },
    { target: "spending", title: "Ringkasan pengeluaran", body: "Grafik pengeluaran per bulan. Beralih antara Realisasi (yang sudah dibayar) dan Jadwal (yang akan jatuh tempo) untuk mengatur arus kas." },
    { target: "target", title: "Progres per fase", body: "Persentase tugas selesai di setiap fase persiapan. Klik Semua untuk membuka checklist lengkap." },
    { target: "payments", title: "Jangan sampai telat bayar", body: "Pembayaran vendor terdekat beserta statusnya. Yang terlambat ditandai merah, yang mendekati tenggat ditandai jingga." },
    { target: "agenda14", title: "Agenda 14 hari ke depan", body: "Fitting, test food, survei, dan acara lain yang akan datang. Semua agenda juga dirangkum di email pagi pukul 07.00 WIB." },
    { target: "search", title: "Cari apa saja dengan cepat", body: "Cari tugas, vendor, tamu, atau dokumen dari halaman mana pun. Tekan Ctrl K untuk langsung mengetik." },
    { target: "help", title: "Butuh tur lagi?", body: "Klik ikon ini kapan saja untuk memutar ulang tur di halaman yang sedang kamu buka. Setiap halaman punya turnya sendiri." },
  ],
  checklist: [
    { target: "checklist-header", title: "Semua tugas persiapan", body: "Checklist disusun dari template Umum ditambah tugas adat yang kamu pilih di Pengaturan. Tenggat dihitung mundur dari tanggal pernikahan." },
    { target: "checklist-add", title: "Tambah tugas sendiri", body: "Tambahkan tugas khusus kalian lengkap dengan fase, tenggat, prioritas, kategori, penanggung jawab, dan vendor terkait." },
    { target: "checklist-progress", title: "Progres keseluruhan", body: "Berapa tugas yang sudah selesai dari semuanya. Di bawahnya ada filter untuk mencari judul, memilih fase, status, penanggung jawab, atau hanya yang terlambat." },
    { target: "checklist-share", title: "Bagi tugas berdua", body: "Progres setiap penanggung jawab terlihat di sini. Klik kartu seseorang untuk melihat tugasnya saja, klik lagi untuk menampilkan semua. Penanggung jawab dipilih di form tugas dan harus sudah bergabung sebagai kolaborator." },
    { target: "checklist-phase-head", title: "Dikelompokkan per fase", body: "Cincin menunjukkan persen selesai di fase ini, lengkap dengan rentang bulannya. Tombol panah di kanan membuka atau menutup fase." },
    { target: "checklist-rows", title: "Diurutkan per bulan", body: "Tugas tersusun menurut tanggal dan dikelompokkan per bulan. Kotak tanggal berwarna jingga bila tenggat tinggal seminggu, dan merah bila terlambat." },
    { target: "checklist-rows", title: "Centang, buka, atau atur", body: "Klik lingkaran untuk menandai selesai, klik judul untuk melihat dan mengubah detail. Menu titik tiga berisi tandai dikerjakan dan hapus." },
  ],
  budget: [
    { target: "budget-header", title: "Kelola uang pernikahan", body: "Semua anggaran, realisasi, dan jadwal pembayaran vendor ada di satu halaman." },
    { target: "budget-stats", title: "Ringkasan keuangan", body: "Total budget, realisasi, yang sudah dibayar, dan sisa tagihan. Semuanya terhitung otomatis dari item dan pembayaran." },
    { target: "budget-pay", title: "Catat setiap pembayaran", body: "DP, termin, dan pelunasan beserta jatuh temponya. Pembayaran yang jatuh tempo besok atau 7 hari lagi masuk ke email pagi dan Google Calendar." },
    { target: "budget-savings", title: "Target tabungan", body: "Berapa yang perlu disisihkan per bulan agar semua tagihan lunas dua minggu sebelum hari H. Perbarui dana terkumpul kapan saja, dan pengingatnya muncul setiap tanggal 1." },
    { target: "budget-chart", title: "Estimasi dan realisasi", body: "Bandingkan rencana dan pengeluaran sebenarnya di setiap kategori, supaya tahu bagian mana yang membengkak." },
    { target: "budget-tabs", title: "Kategori atau jadwal", body: "Lihat budget per kategori lengkap dengan peringatan bila melebihi alokasi, beralih ke daftar jadwal pembayaran, atau buka Per Pihak untuk melihat bagian pihak pria dan pihak wanita." },
    { target: "budget-category", title: "Isi setiap kategori", body: "Buka kategori untuk menambah item, mengisi estimasi dan realisasi, serta mengatur alokasinya. Kategori adat ikut tersedia sesuai gaya pernikahanmu." },
  ],
  vendor: [
    { target: "vendor-header", title: "Kelola semua vendor", body: "Katering, dekorasi, MUA, dokumentasi, dan lainnya, dari tahap prospek sampai deal." },
    { target: "vendor-add", title: "Catat vendor incaran", body: "Simpan kontak, kategori, paket, dan harga vendor yang sedang kalian pertimbangkan." },
    { target: "vendor-view", title: "Tabel atau pipeline", body: "Tampilan tabel untuk membandingkan, atau pipeline untuk melihat alur dari prospek, survei, negosiasi, sampai deal. Seret kartu untuk mengubah status." },
    { target: "vendor-main", title: "Buka detail vendor", body: "Klik vendor untuk melihat paket, pembayaran, dokumen, dan tugas terkait. Hubungi lewat WhatsApp langsung dari daftar." },
  ],
  "vendor-detail": [
    { target: "vendor-detail-main", title: "Ringkasan vendor", body: "Kontak, status, dan nilai deal. Tandai Deal untuk membuat item budget dan jadwal DP serta pelunasan sekaligus." },
    { target: "vendor-detail-tabs", title: "Paket, pembayaran, dokumen, tugas", body: "Semua yang berkaitan dengan vendor ini ada di tab. Bandingkan paket, catat pembayaran, simpan kontrak, dan pantau tugasnya." },
  ],
  tamu: [
    { target: "tamu-header", title: "Daftar tamu dan RSVP", body: "Kelola tamu, kirim undangan digital, dan pantau konfirmasi kehadiran dari satu halaman." },
    { target: "tamu-stats", title: "Rekap RSVP langsung terbarui", body: "Jumlah undangan, total orang, yang hadir, tidak hadir, dan belum merespons. Konfirmasi baru juga dirangkum lewat email pukul 19.00 WIB." },
    { target: "tamu-tabs", title: "Tamu dan ucapan", body: "Tab Daftar Tamu berisi semua undangan. Tab Ucapan mengumpulkan doa dan pesan yang ditulis tamu saat mengisi RSVP." },
    { target: "tamu-actions", title: "Impor, template, dan tambah", body: "Impor daftar tamu dari Excel atau CSV, atur template pesan WhatsApp, atau tambah tamu satu per satu." },
    { target: "tamu-filter", title: "Saring daftar tamu", body: "Persempit daftar berdasarkan grup, pihak, status RSVP, atau yang belum dikirimi undangan." },
    { target: "tamu-send", title: "Kirim undangan via WhatsApp", body: "Pesan berisi tautan undangan pribadi dengan nama tamu langsung terisi. Setelah terkirim, tamu otomatis ditandai sudah dikirimi. Tamu yang menjawab Hadir mendapat QR masuk untuk check-in di hari H." },
  ],
  rundown: [
    { target: "rundown-header", title: "Rundown per acara", body: "Pilih acara di tab, lalu susun kegiatan berurutan lengkap dengan jam, PIC, dan lokasi. Acara adat seperti siraman ikut muncul di sini." },
    { target: "rundown-actions", title: "Tambah kegiatan dan unduh PDF", body: "PDF siap cetak berisi kop acara, tabel kegiatan, nomor halaman, dan kolom tanda tangan. Bila ada beberapa acara, tersedia juga PDF semua acara." },
    { target: "rundown-main", title: "Daftar kegiatan", body: "Kegiatan yang jamnya bertabrakan diberi tanda. Urutan di jam yang sama bisa digeser lewat menu titik tiga." },
  ],
  mahar: [
    { target: "mahar-header", title: "Mahar dan seserahan", body: "Catat rencana barang, harga, toko, dan progres pembelian." },
    { target: "mahar-tabs", title: "Pisahkan mahar dan seserahan", body: "Pindah tab untuk mengelola mahar dan seserahan secara terpisah. Ringkasan di bawahnya ikut menyesuaikan." },
    { target: "mahar-actions", title: "Tambah item", body: "Isi nama, jenis, estimasi harga, dan tautan toko. Centang catat ke budget agar otomatis masuk kategori Mahar & Seserahan." },
    { target: "mahar-main", title: "Pantau statusnya", body: "Ubah status dari rencana sampai diterima. Total estimasi dan yang sudah dibeli dihitung otomatis." },
  ],
  harih: [
    { target: "harih-header", title: "Mode Hari H", body: "Satu layar untuk hari pernikahan: rundown yang berjalan sesuai jam, kontak vendor, tugas hari H, dan kehadiran tamu. Layar dijaga tetap menyala selama halaman terbuka." },
    { target: "harih-now", title: "Sekarang dan berikutnya", body: "Kegiatan yang sedang berlangsung dan yang akan datang, diambil dari Rundown Hari H. Data dimuat ulang otomatis setiap 30 detik." },
    { target: "harih-attendance", title: "Check-in tamu", body: "Tekan Pindai QR untuk memindai QR masuk tamu, atau cari namanya. Tamu yang tidak terdaftar bisa langsung dimasukkan." },
    { target: "harih-vendor", title: "Hubungi vendor sekali ketuk", body: "Vendor berstatus deal tampil di sini dengan tombol telepon dan WhatsApp." },
    { target: "harih-timeline", title: "Rundown lengkap", body: "Kegiatan yang sudah lewat diredupkan, yang sedang berjalan disorot. Bagikan halaman ini ke panitia lewat Tautan Panitia di Pengaturan, tab Kolaborator." },
  ],
  amplop: [
    { target: "amplop-header", title: "Amplop & Kado", body: "Catat amplop, transfer, dan kado dari tamu setelah acara. Semua tersimpan rapi untuk ucapan terima kasih dan sebagai catatan saat gantian kondangan nanti." },
    { target: "amplop-actions", title: "Catat dengan cepat", body: "Ketik nama untuk memilih dari daftar tamu, isi nominal atau nama barang, lalu tekan Simpan & catat lagi untuk lanjut ke pemberi berikutnya. Teks ucapan terima kasih bisa diubah sesuai gaya kalian." },
    { target: "amplop-stats", title: "Rekap otomatis", body: "Total amplop dan transfer, jumlah pemberi, jumlah kado, dan berapa yang sudah diberi ucapan." },
    { target: "amplop-main", title: "Kirim ucapan terima kasih", body: "Tombol Kirim ucapan membuka WhatsApp dengan pesan yang sudah terisi nama pemberi, lalu menandainya sudah. Saring yang belum diberi ucapan agar tidak ada yang terlewat." },
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
    { target: "dokumen-main", title: "Checklist dokumen KUA", body: "Dokumen mempelai pria, wanita, dan bersama. Centang yang sudah lengkap dan hubungkan dengan berkas yang diunggah." },
    { target: "dokumen-arsip", title: "Arsip berkas", body: "Semua berkas yang diunggah, bisa disaring per kategori dan ditampilkan sebagai kisi atau daftar. Pratinjau dan unduh lewat menu titik tiga." },
  ],
  kalender: [
    { target: "kalender-header", title: "Satu kalender untuk semua", body: "Tugas, jatuh tempo pembayaran, acara, dan agenda tampil bersama dengan warna berbeda." },
    { target: "kalender-google", title: "Sambungkan Google Calendar", body: "Wajib sebelum menambah tugas, pembayaran, atau agenda bertanggal. Semua jadwal masuk ke kalender terpisah bernama Monaplan dan pengingatnya muncul di HP." },
    { target: "kalender-actions", title: "Tambah agenda", body: "Agenda bisa diberi pengingat 1 minggu, 1 hari, atau 1 jam sebelum. Agenda hari ini dan besok juga dirangkum di email pukul 07.00 WIB." },
    { target: "kalender-view", title: "Bulan, minggu, atau daftar", body: "Pilih tampilan yang paling nyaman. Di HP, tampilan daftar paling mudah dibaca." },
    { target: "kalender-main", title: "Klik untuk detail", body: "Klik item untuk membuka halamannya. Klik dua kali pada sebuah tanggal untuk langsung menambah agenda di tanggal itu." },
  ],
  pengaturan: [
    { target: "pengaturan-header", title: "Pengaturan pernikahan", body: "Data pasangan, acara, budget, undangan, dan kolaborator diatur dari sini." },
    { target: "pengaturan-tabs", title: "Enam bagian pengaturan", body: "Pasangan, Acara (akad, resepsi, dan acara adat), Budget dan Tamu, Undangan RSVP (tema dan tautan), Kolaborator, dan Lainnya (arsip dan ekspor)." },
    { target: "pengaturan-main", title: "Pasangan dan alamat ruang kerja", body: "Ubah nama, panggilan, dan alamat ruang kerja. Alamat ini juga menjadi tautan undangan digital untuk tamu." },
    { target: "pengaturan-gaya", title: "Gaya pernikahan", body: "Pilih Umum atau adat Jawa, Sunda, Bali, Minang, dan Batak. Tugas, kategori budget, dan acara adat ditambahkan tanpa menghapus yang sudah ada." },
    { target: "pengaturan-cover", title: "Foto sampul undangan", body: "Foto ini tampil di halaman undangan digital yang dibuka tamu." },
    { target: "settings-staff", title: "Tautan panitia", body: "Bagikan ke keluarga atau penerima tamu tanpa perlu akun. Mereka bisa melihat rundown, menghubungi vendor, dan check-in tamu. Buat ulang tautan bila tersebar ke orang yang tidak semestinya." },
  ],
  panduan: [
    { target: "panduan-header", title: "Panduan penggunaan", body: "Sembilan langkah berurutan untuk memulai dari nol, diawali memasang Monaplan di HP agar pengingat langsung sampai." },
    { target: "panduan-main", title: "Selesai otomatis", body: "Setiap langkah tercentang sendiri saat syaratnya terpenuhi, dan tombolnya membawamu ke halaman yang tepat." },
  ],
  bantuan: [
    { target: "help-install", title: "Pasang di HP", body: "Ikuti langkah untuk Android atau iPhone agar Monaplan bisa dibuka dari layar utama dan pengingatnya muncul sebagai notifikasi." },
    { target: "help-faq", title: "Cari jawabannya dulu", body: "Ketik kata kunci atau pilih kategori untuk melihat pertanyaan yang sering diajukan." },
    { target: "help-tours", title: "Putar ulang tur halaman", body: "Pilih halaman mana pun untuk melihat turnya lagi, atau ulangi semua tur sekaligus." },
    { target: "help-contact", title: "Tidak ketemu jawabannya?", body: "Chat admin lewat WhatsApp. Pesan awalnya sudah terisi, tinggal kirim." },
  ],
  akun: [
    { target: "akun-profil", title: "Profil dan notifikasi", body: "Ubah nama dan nomor WhatsApp, serta atur apakah pengingat dikirim ke email." },
    { target: "akun-lisensi", title: "Lisensi dan upgrade", body: "Lihat status aksesmu. Upgrade ke paket yang lebih tinggi hanya membayar selisih dari yang sudah kamu bayar." },
    { target: "akun-push", title: "Notifikasi di HP", body: "Nyalakan untuk menerima pengingat dan RSVP baru langsung di perangkat ini. Di iPhone, pasang Monaplan ke Layar Utama dulu." },
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
