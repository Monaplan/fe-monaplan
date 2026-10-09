"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Hourglass } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { StatusPill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { saveTrialSettings, setFeatureEnabled } from "@/features/admin/config-actions";

export function TrialClient({ enabled: initial, days, stats, migrated }: { enabled: boolean; days: number; stats: { total: number; active: number }; migrated: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [enabled, setEnabled] = useState(initial);
  const [pending, start] = useTransition();
  useEffect(() => setEnabled(initial), [initial]);

  function toggle(next: boolean) {
    setEnabled(next);
    start(async () => {
      const res = await setFeatureEnabled("trial", next);
      if (res.ok) { toast(res.message ?? "Tersimpan."); router.refresh(); }
      else { setEnabled(!next); toast(res.error, "danger"); }
    });
  }

  return (
    <>
      <PageHeader title="Trial" description="Biarkan calon pengguna mencoba semua fitur tanpa memilih paket atau membayar." />

      {!migrated && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          Tabel pengaturan belum ada di database. Jalankan migrasi 20261009000004_trial_promo_calendar.sql di Supabase SQL Editor, lalu muat ulang halaman ini.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader icon={<Hourglass />} title="Fitur trial" subtitle="Saat aktif, akun baru langsung bisa mencoba tanpa diarahkan ke halaman pembayaran."
              action={<Switch label="Aktifkan trial" checked={enabled} onChange={toggle} disabled={pending || !migrated} />} />
            <div className="flex items-center gap-2">
              <StatusPill tone={enabled ? "positive" : "neutral"}>{enabled ? "Aktif" : "Dimatikan"}</StatusPill>
              <span className="text-[13px] text-neutral-600">{enabled ? "Landing page menampilkan ajakan coba gratis." : "Pengguna baru diarahkan memilih paket atau memakai kode akses."}</span>
            </div>
          </Card>

          <Card>
            <CardHeader title="Lama trial" subtitle="Berlaku untuk trial yang dimulai setelah disimpan. Trial yang sedang berjalan tidak berubah." />
            <ActionForm action={saveTrialSettings}>
              {enabled && <input type="hidden" name="enabled" value="on" />}
              <Field label="Jumlah hari" htmlFor="tr-days" help="1 sampai 90 hari. Teks di landing page ikut menyesuaikan.">
                <Input id="tr-days" name="days" type="number" min={1} max={90} defaultValue={days} required className="max-w-40" />
              </Field>
              <div><SubmitButton>Simpan</SubmitButton></div>
            </ActionForm>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Pemakaian" />
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-neutral-50 p-3"><dt className="text-xs text-neutral-500">Sedang berjalan</dt><dd className="tabular mt-1 text-2xl font-bold">{stats.active}</dd></div>
              <div className="rounded-xl bg-neutral-50 p-3"><dt className="text-xs text-neutral-500">Total pernah</dt><dd className="tabular mt-1 text-2xl font-bold">{stats.total}</dd></div>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Cara kerja" />
            <ul className="list-disc space-y-2 pl-5 text-[13px] leading-5 text-neutral-600">
              <li>Akun yang belum pernah punya akses otomatis dapat trial saat pertama masuk.</li>
              <li>Setiap akun hanya sekali. Akun yang pernah punya akses tidak dapat trial.</li>
              <li>Setelah trial habis, ruang kerja menjadi baca-saja dan pengguna ditawari akses selamanya. Data tidak dihapus.</li>
              <li>Untuk pengguna tertentu, admin bisa memberi trial tambahan dari menu Pengguna.</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
