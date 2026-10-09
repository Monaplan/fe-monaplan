import { Logo } from "@/components/app/logo";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Kebijakan Privasi",
  description: "Cara Monaplan mengumpulkan, memakai, dan melindungi data pribadi sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.",
  path: "/privasi",
});

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-plum-50 px-4 py-10">
      <article className="mx-auto max-w-2xl rounded-xl border border-neutral-200 bg-surface p-6 text-sm leading-6 text-neutral-700 sm:p-8">
        <Logo className="mb-6" />
        <h1 className="mb-4 font-display text-[32px] leading-10 font-medium text-neutral-900">Kebijakan Privasi</h1>
        <p className="mb-3">Monaplan mengolah data pribadi sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.</p>
        <h2 className="mt-6 mb-2 text-base font-semibold text-neutral-900">Data yang kami kumpulkan</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Nama, email, dan foto profil dari akun Google kamu.</li>
          <li>Data perencanaan pernikahan yang kamu masukkan, termasuk data tamu (nama dan nomor WhatsApp).</li>
          <li>Riwayat pembayaran yang diproses oleh Midtrans. Kami tidak menyimpan data kartu.</li>
        </ul>
        <h2 className="mt-6 mb-2 text-base font-semibold text-neutral-900">Penggunaan data</h2>
        <p>Data tamu hanya dipakai untuk keperluan undangan dan konfirmasi kehadiran. Berkas disimpan di penyimpanan privat dan hanya bisa diakses anggota ruang kerja melalui tautan berumur pendek. Admin Monaplan tidak membuka isi proyek tanpa izinmu.</p>
        <h2 className="mt-6 mb-2 text-base font-semibold text-neutral-900">Hak kamu</h2>
        <p>Kamu bisa mengekspor data proyek dari menu Pengaturan Pernikahan dan menghapus akun beserta datamu dari halaman Akun kapan saja.</p>
        <p className="mt-6 text-xs text-neutral-500">Dokumen ini adalah draf dan perlu ditinjau sebelum peluncuran.</p>
      </article>
    </main>
  );
}
