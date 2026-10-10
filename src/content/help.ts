// Isi Pusat Bantuan: kategori, FAQ, dan daftar tur halaman. Dua bahasa.
export type L = { id: string; en: string };

export const HELP_CATEGORIES: { key: string; label: L }[] = [
  { key: "mulai", label: { id: "Memulai", en: "Getting started" } },
  { key: "perencanaan", label: { id: "Perencanaan", en: "Planning" } },
  { key: "tamu", label: { id: "Tamu & RSVP", en: "Guests & RSVP" } },
  { key: "berkas", label: { id: "Berkas & kalender", en: "Files & calendar" } },
  { key: "akun", label: { id: "Akun & paket", en: "Account & plans" } },
];

export const HELP_FAQ: { cat: string; q: L; a: L }[] = [
  { cat: "mulai", q: { id: "Dari mana sebaiknya mulai?", en: "Where should I start?" }, a: { id: "Isi tanggal dan acara di Pengaturan Pernikahan, lalu ikuti delapan langkah di Panduan Penggunaan. Checklist rekomendasi dibuat otomatis dari tanggal pernikahanmu.", en: "Add your date and events in Wedding Settings, then follow the eight steps in the Usage Guide. A recommended checklist is generated from your wedding date." } },
  { cat: "mulai", q: { id: "Bagaimana mengundang pasangan atau keluarga?", en: "How do I invite my partner or family?" }, a: { id: "Buka Pengaturan Pernikahan, tab Kolaborator, masukkan email mereka, dan pilih peran Editor atau Viewer. Tautan undangan juga bisa disalin dan dikirim sendiri.", en: "Open Wedding Settings, Collaborators tab, enter their email, and pick Editor or Viewer. You can also copy the invitation link and send it yourself." } },
  { cat: "mulai", q: { id: "Apa bedanya Editor dan Viewer?", en: "What is the difference between Editor and Viewer?" }, a: { id: "Editor bisa menambah dan mengubah data. Viewer hanya bisa melihat. Keduanya tidak perlu membayar sendiri.", en: "Editors can add and change data. Viewers can only look. Neither needs to pay on their own." } },
  { cat: "perencanaan", q: { id: "Bagaimana due date checklist dihitung?", en: "How are checklist due dates calculated?" }, a: { id: "Dihitung mundur dari tanggal pernikahan. Bila tanggal diubah, due date tugas dari template ikut menyesuaikan.", en: "They count back from your wedding date. If you change the date, template tasks move with it." } },
  { cat: "perencanaan", q: { id: "Kenapa budget saya berwarna merah?", en: "Why is my budget showing red?" }, a: { id: "Realisasi sebuah kategori melebihi alokasinya. Naikkan alokasi atau kurangi item di kategori itu.", en: "A category's actual spending is above its allocation. Raise the allocation or reduce items in that category." } },
  { cat: "perencanaan", q: { id: "Vendor yang deal masuk ke budget?", en: "Do deal vendors go into the budget?" }, a: { id: "Ya. Saat menandai vendor sebagai Deal, pilih kategori budget, dan jadwal DP serta pelunasan ikut dibuat.", en: "Yes. When you mark a vendor as Deal, pick a budget category and the down payment and final payment schedule is created too." } },
  { cat: "perencanaan", q: { id: "Bagaimana mengunduh rundown sebagai PDF?", en: "How do I download the rundown as a PDF?" }, a: { id: "Buka Rundown Hari H, pilih acara, lalu klik Unduh PDF. Bila ada beberapa acara, PDF semua acara juga tersedia.", en: "Open Event Rundown, choose an event, then click Download PDF. With several events, an all-events PDF is available too." } },
  { cat: "tamu", q: { id: "Bagaimana tamu mengonfirmasi hadir?", en: "How do guests confirm attendance?" }, a: { id: "Tiap tamu punya tautan RSVP pribadi. Kirim lewat WhatsApp dari daftar tamu. Mereka tidak perlu membuat akun.", en: "Each guest has a personal RSVP link. Send it via WhatsApp from the guest list. They do not need an account." } },
  { cat: "tamu", q: { id: "Bisakah mengimpor daftar tamu?", en: "Can I import a guest list?" }, a: { id: "Bisa, dari file CSV atau Excel lewat tombol Impor di halaman Tamu & RSVP. Kolom nama dan nomor WhatsApp dikenali otomatis.", en: "Yes, from a CSV or Excel file with the Import button on the Guests & RSVP page. Name and WhatsApp columns are detected automatically." } },
  { cat: "berkas", q: { id: "Berapa batas penyimpanan berkas?", en: "What is the file storage limit?" }, a: { id: "Maksimal 5 MB per file dan total 50 MB per akun, termasuk berkas yang diunggah kolaborator. Format PDF, JPG, PNG, atau WEBP. Foto dikompres otomatis.", en: "Up to 5 MB per file and 50 MB per account in total, including files uploaded by collaborators. PDF, JPG, PNG, or WEBP. Photos are compressed automatically." } },
  { cat: "berkas", q: { id: "Cara memperkecil PDF yang terlalu besar?", en: "How do I shrink a PDF that is too large?" }, a: { id: "Scan dengan resolusi lebih rendah atau gunakan fitur kompres PDF di ponsel atau komputer, lalu unggah lagi.", en: "Scan at a lower resolution or use a PDF compressor on your phone or computer, then upload again." } },
  { cat: "berkas", q: { id: "Bagaimana menampilkan jadwal di Google Calendar?", en: "How do I show my schedule in Google Calendar?" }, a: { id: "Buka Reminder & Calendar, klik Google Calendar, lalu Hubungkan. Kalender Monaplan dibuat terpisah, dan perubahan dikirim otomatis. Pengingat muncul sebagai notifikasi Google.", en: "Open Reminders & Calendar, click Google Calendar, then Connect. A separate Monaplan calendar is created and changes sync automatically. Reminders arrive as Google notifications." } },
  { cat: "berkas", q: { id: "Mengubah event di Google ikut mengubah Monaplan?", en: "Does editing an event in Google change Monaplan?" }, a: { id: "Tidak. Sinkron hanya satu arah dari Monaplan ke Google. Ubah jadwal dari Monaplan.", en: "No. Sync is one way, from Monaplan to Google. Make changes in Monaplan." } },
  { cat: "akun", q: { id: "Apa yang terjadi setelah trial berakhir?", en: "What happens when the trial ends?" }, a: { id: "Datamu tetap aman dan bisa dilihat dan diekspor. Aktifkan akses selamanya untuk kembali mengedit.", en: "Your data stays safe and can be viewed and exported. Activate lifetime access to edit again." } },
  { cat: "akun", q: { id: "Kalau upgrade, apakah bayar penuh?", en: "If I upgrade, do I pay the full price?" }, a: { id: "Tidak. Upgrade ke paket yang lebih tinggi hanya membayar selisih: harga paket baru dikurangi yang sudah kamu bayar. Dari trial atau kode akses, harga paket berlaku penuh.", en: "No. Upgrading to a higher plan only costs the difference: the new price minus what you already paid. From a trial or an access code, the full plan price applies." } },
  { cat: "akun", q: { id: "Di mana kuitansi pembayaran?", en: "Where is my payment receipt?" }, a: { id: "Di Akun > Tagihan. Kuitansi juga dikirim ke email setelah pembayaran berhasil.", en: "In Account > Billing. A receipt is also emailed after a successful payment." } },
  { cat: "akun", q: { id: "Bagaimana menghapus akun saya?", en: "How do I delete my account?" }, a: { id: "Buka Akun, bagian Hapus Akun. Semua proyek dan berkas milikmu ikut terhapus dan tidak bisa dikembalikan. Ekspor datamu dulu bila perlu.", en: "Open Account, Delete Account section. All your projects and files are removed and cannot be recovered. Export your data first if needed." } },
];

// Tur halaman: id tur, nama, dan jalur relatif terhadap ruang kerja (kosong = beranda ruang kerja)
export const HELP_TOURS: { id: string; label: L; path: string; scope: "app" | "akun" }[] = [
  { id: "dashboard", label: { id: "Dashboard", en: "Dashboard" }, path: "", scope: "app" },
  { id: "checklist", label: { id: "To Do Checklist", en: "To-do checklist" }, path: "checklist", scope: "app" },
  { id: "budget", label: { id: "Budgeting", en: "Budgeting" }, path: "budget", scope: "app" },
  { id: "vendor", label: { id: "Kelola Vendor", en: "Vendors" }, path: "vendor", scope: "app" },
  { id: "tamu", label: { id: "Tamu & RSVP", en: "Guests & RSVP" }, path: "tamu", scope: "app" },
  { id: "rundown", label: { id: "Rundown Hari H", en: "Event rundown" }, path: "rundown", scope: "app" },
  { id: "mahar", label: { id: "Mahar & Seserahan", en: "Gifts" }, path: "mahar-seserahan", scope: "app" },
  { id: "dokumen", label: { id: "Dokumen Penting", en: "Documents" }, path: "dokumen", scope: "app" },
  { id: "kalender", label: { id: "Reminder & Calendar", en: "Reminders & calendar" }, path: "kalender", scope: "app" },
  { id: "inspirasi", label: { id: "Rona Impian", en: "Rona Impian" }, path: "rona-impian", scope: "app" },
  { id: "perjalanan", label: { id: "Honeymoon Planner", en: "Honeymoon Planner" }, path: "honeymoon-planner", scope: "app" },
  { id: "pengaturan", label: { id: "Pengaturan Pernikahan", en: "Wedding settings" }, path: "pengaturan", scope: "app" },
  { id: "panduan", label: { id: "Panduan Penggunaan", en: "Usage guide" }, path: "panduan", scope: "app" },
  { id: "akun", label: { id: "Akun & Lisensi", en: "Account & license" }, path: "/akun", scope: "akun" },
];
