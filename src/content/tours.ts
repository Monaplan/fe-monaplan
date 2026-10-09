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
};
