import { Cloud, Database, ExternalLink, FileText, HardDrive, Triangle } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/pill";
import { listAllObjects, storageDriver } from "@/lib/storage";
import { getI18n } from "@/i18n/server";
import { PurgeButton } from "../order/purge-button";
import { OrphanFiles } from "../order/orphan-files";
import { RefreshButton } from "./refresh-button";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("Sistem") };
}

const MB = 1048576;
// Batas paket layanan; ubah lewat env bila paket Supabase atau R2 berbeda
const DB_LIMIT_MB = Number(process.env.SYSTEM_DB_LIMIT_MB) || 500;
const STORAGE_LIMIT_MB = Number(process.env.SYSTEM_STORAGE_LIMIT_MB) || 10240;
// Batas paket gratis sebagai acuan; angka yang tidak bisa dibaca dari aplikasi (bandwidth, operasi R2) dicek di dasbor masing-masing
const MAU_LIMIT = Number(process.env.SYSTEM_MAU_LIMIT) || 50000;
const HOST = { supabase: "Supabase", vercel: "Vercel", r2: "Cloudflare R2" };
const SB_EGRESS_GB = 5;
const VERCEL_BANDWIDTH_GB = 100;
const R2_WRITE_OPS = "1 juta";
const R2_READ_OPS = "10 juta";
const FOLDERS = ["documents", "gifts", "cover", "inspiration"] as const;
const FOLDER_LABEL: Record<string, string> = { documents: "Dokumen", gifts: "Hadiah", cover: "Sampul", inspiration: "Rona Impian" };

const size = (bytes: number) => (bytes >= 1024 * MB ? `${(bytes / (1024 * MB)).toFixed(2)} GB` : `${(bytes / MB).toFixed(1)} MB`);
const tone = (ratio: number) => (ratio >= 0.9 ? "danger" : ratio >= 0.7 ? "caution" : "default") as "danger" | "caution" | "default";

async function storageStats(admin: ReturnType<typeof createAdminClient>) {
  if (storageDriver() !== "r2") return null;
  try {
    const objects = await listAllObjects();
    const perFolder: Record<string, number> = {};
    const perProject: Record<string, number> = {};
    let bytes = 0;
    for (const o of objects) {
      bytes += o.size;
      const [prefix, folder] = o.key.split("/");
      perFolder[folder!] = (perFolder[folder!] ?? 0) + o.size;
      perProject[prefix!] = (perProject[prefix!] ?? 0) + o.size;
    }
    const top = Object.entries(perProject).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const names: Record<string, string> = {};
    if (top.length) {
      const prefixes = top.map(([p]) => p);
      const { data } = await admin.from("wedding_projects").select("id, name, storage_prefix").in("storage_prefix", prefixes);
      for (const p of data ?? []) names[p.storage_prefix as string] = p.name as string;
      const ids = prefixes.filter((p) => /^[0-9a-f-]{36}$/.test(p) && !names[p]);
      if (ids.length) {
        const { data: byId } = await admin.from("wedding_projects").select("id, name").in("id", ids);
        for (const p of byId ?? []) names[p.id as string] = p.name as string;
      }
    }
    return { count: objects.length, bytes, perFolder, top: top.map(([p, b]) => ({ name: names[p] ?? p, bytes: b })) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export default async function SystemPage() {
  const { t } = await getI18n();
  await requireAdmin();
  const admin = createAdminClient();
  const count = (table: string, f?: (q: any) => any) => {
    const q = admin.from(table).select("*", { count: "exact", head: true });
    return (f ? f(q) : q).then((r: any) => r.count ?? 0) as Promise<number>;
  };

  const [dbRes, storage, documents, tasks, review, notifications, deposits, receipts, devices, checkedIn, users, projects] = await Promise.all([
    admin.rpc("admin_system_stats"),
    storageStats(admin),
    count("documents"), count("tasks"),
    count("orders", (q) => q.eq("needs_review", true)), count("notifications"),
    count("savings_deposits"), count("gift_receipts"), count("push_subscriptions"), count("guests", (q) => q.not("checked_in_at", "is", null)),
    count("profiles"), count("wedding_projects"),
  ]);

  const db = dbRes.error ? null : (dbRes.data as { db_bytes: number; connections: number; tables: { name: string; bytes: number; rows: number }[] });
  const dbRatio = db ? db.db_bytes / MB / DB_LIMIT_MB : 0;
  const st = storage && !("error" in storage) ? storage : null;
  const stRatio = st ? st.bytes / MB / STORAGE_LIMIT_MB : 0;

  const services: [string, boolean, string?][] = [
    // Tanpa kunci klien, metode pembayaran tidak bisa ditampilkan di halaman dan pembeli dialihkan ke halaman Midtrans
    ["Midtrans", !!process.env.MIDTRANS_SERVER_KEY && !!process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY, !process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ? t("Kunci klien kosong") : process.env.MIDTRANS_IS_PRODUCTION === "true" ? t("Produksi") : t("Sandbox")],
    ["Email (Resend)", !!process.env.RESEND_API_KEY],
    ["Cloudflare R2", storageDriver() === "r2"],
    ["Google Calendar", !!process.env.GOOGLE_CLIENT_ID],
    [t("Pengingat terjadwal (cron)"), !!process.env.CRON_SECRET, t("Email dan notifikasi pengingat")],
    [t("Notifikasi HP (push)"), !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY, !process.env.VAPID_PRIVATE_KEY ? t("Kunci VAPID belum diisi") : undefined],
    [t("WhatsApp bantuan"), !!process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP],
  ];
  const content: [string, number][] = [
    [t("Dokumen terunggah"), documents], [t("Tugas"), tasks], [t("Notifikasi tersimpan"), notifications], [t("Setoran tabungan"), deposits], [t("Catatan amplop dan kado"), receipts],
    [t("Perangkat notifikasi HP"), devices], [t("Tamu sudah check-in"), checkedIn], [t("Order perlu ditinjau"), review],
  ];

  // Perkiraan daya tampung: rata-rata per proyek baru berarti bila datanya cukup banyak (bawaan skema membuat angka awal terlalu besar)
  const enough = projects >= 10;
  const dbPerProject = db && enough ? db.db_bytes / projects : 0;
  const r2PerProject = st && enough ? st.bytes / projects : 0;
  const dbRoom = dbPerProject > 0 ? Math.max(0, Math.floor((DB_LIMIT_MB * MB * 0.8 - (db?.db_bytes ?? 0)) / dbPerProject)) : null;
  const r2Room = r2PerProject > 0 ? Math.max(0, Math.floor((STORAGE_LIMIT_MB * MB * 0.8 - (st?.bytes ?? 0)) / r2PerProject)) : null;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const onVercel = !!process.env.VERCEL;
  const row = (label: string, value: React.ReactNode) => (
    <div key={label} className="flex items-center justify-between gap-3 border-t border-neutral-100 py-2 text-[13px] first:border-0"><span className="text-neutral-600">{label}</span><span className="tabular text-right font-medium">{value}</span></div>
  );
  const link = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-plum-600 hover:underline">{label}<ExternalLink className="size-3.5" aria-hidden="true" /></a>
  );

  return (
    <>
      <PageHeader title={t("Sistem")} description={t("Pemakaian penyimpanan, ukuran database, dan status layanan.")} actions={<RefreshButton />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<Database />} title={t("Database")} subtitle={t("Batas {mb} MB", { mb: DB_LIMIT_MB })} />
          {db ? (
            <>
              <p className="tabular text-2xl font-semibold">{size(db.db_bytes)} <span className="text-[13px] font-normal text-neutral-500">{t("dari {mb} MB", { mb: DB_LIMIT_MB })} · {Math.round(dbRatio * 100)}%</span></p>
              <ProgressBar value={dbRatio} tone={tone(dbRatio)} className="mt-3" />
              <p className="mt-2 text-[12px] text-neutral-500">{t("Sisa {size} · {n} koneksi aktif", { size: size(Math.max(0, DB_LIMIT_MB * MB - db.db_bytes)), n: db.connections })}</p>
              <p className="mt-4 mb-1 text-[12px] font-semibold text-neutral-700">{t("Tabel terbesar")}</p>
              {db.tables.map((x) => (
                <div key={x.name} className="flex items-center justify-between border-t border-neutral-100 py-1.5 text-[13px]">
                  <span>{x.name}</span><span className="tabular text-neutral-600">{size(x.bytes)} · {x.rows.toLocaleString("id-ID")} {t("baris")}</span>
                </div>
              ))}
            </>
          ) : (
            <p className="text-[13px] text-neutral-600">{t("Ukuran database belum tersedia. Jalankan migrasi 20261010000001_system_stats.sql di Supabase SQL Editor.")}</p>
          )}
        </Card>

        <Card>
          <CardHeader icon={<HardDrive />} title={t("Penyimpanan berkas")} subtitle={t("Batas {mb} MB", { mb: STORAGE_LIMIT_MB })} />
          {st ? (
            <>
              <p className="tabular text-2xl font-semibold">{size(st.bytes)} <span className="text-[13px] font-normal text-neutral-500">{t("dari {size}", { size: size(STORAGE_LIMIT_MB * MB) })} · {Math.round(stRatio * 100)}%</span></p>
              <ProgressBar value={stRatio} tone={tone(stRatio)} className="mt-3" />
              <p className="mt-2 text-[12px] text-neutral-500">{t("Sisa {size} · {n} berkas", { size: size(Math.max(0, STORAGE_LIMIT_MB * MB - st.bytes)), n: st.count })}</p>
              <p className="mt-4 mb-1 text-[12px] font-semibold text-neutral-700">{t("Menurut jenis")}</p>
              {FOLDERS.map((f) => (
                <div key={f} className="flex items-center justify-between border-t border-neutral-100 py-1.5 text-[13px]"><span>{t(FOLDER_LABEL[f]!)}</span><span className="tabular text-neutral-600">{size(st.perFolder[f] ?? 0)}</span></div>
              ))}
              {st.top.length > 0 && <p className="mt-4 mb-1 text-[12px] font-semibold text-neutral-700">{t("Proyek terbesar")}</p>}
              {st.top.map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-3 border-t border-neutral-100 py-1.5 text-[13px]"><span className="min-w-0 truncate">{p.name}</span><span className="tabular shrink-0 text-neutral-600">{size(p.bytes)}</span></div>
              ))}
            </>
          ) : (
            <p className="text-[13px] text-neutral-600">{storage && "error" in storage ? t("Gagal membaca R2: {error}", { error: storage.error }) : t("Statistik penyimpanan hanya tersedia untuk Cloudflare R2.")}</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<FileText />} title={t("Isi database")} />
          {content.map(([label, v]) => (
            <div key={label} className="flex items-center justify-between border-t border-neutral-100 py-2 text-[13px] first:border-0"><span>{label}</span><span className="tabular font-medium">{v.toLocaleString("id-ID")}</span></div>
          ))}
        </Card>
        <Card>
          <CardHeader title={t("Status layanan")} />
          {services.map(([name, ok, note]) => (
            <div key={name} className="flex items-center justify-between border-t border-neutral-100 py-2 text-[13px] first:border-0">
              <span>{name}{note && <span className="ml-2 text-neutral-500">{note}</span>}</span>
              <StatusPill tone={ok ? "positive" : "neutral"}>{ok ? t("Terhubung") : t("Belum diatur")}</StatusPill>
            </div>
          ))}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader icon={<Database />} title={HOST.supabase} subtitle={t("Database dan akun pengguna")} />
          {row(t("Akun terdaftar"), `${users.toLocaleString("id-ID")} / ${MAU_LIMIT.toLocaleString("id-ID")} MAU`)}
          {row(t("Proyek pernikahan"), projects.toLocaleString("id-ID"))}
          {row(t("Koneksi aktif"), db ? db.connections : "-")}
          {row(t("Batas transfer keluar"), `${SB_EGRESS_GB} GB / ${t("bulan")}`)}
          {row(t("Perkiraan muat (sampai 80%)"), dbRoom === null ? t("Butuh 10 proyek") : `${dbRoom.toLocaleString("id-ID")} ${t("proyek lagi")}`)}
          <p className="mt-2 text-[12px] leading-5 text-neutral-500">{t("Paket gratis: proyek dijeda setelah 1 minggu tanpa aktivitas dan tanpa backup harian. Ekspor data berkala.")}</p>
          {link("https://supabase.com/dashboard", t("Buka dasbor Supabase"))}
        </Card>

        <Card>
          <CardHeader icon={<Triangle />} title={HOST.vercel} subtitle={t("Hosting aplikasi")} />
          {row(t("Lingkungan"), onVercel ? (process.env.VERCEL_ENV ?? "-") : t("Lokal"))}
          {row(t("Wilayah"), process.env.VERCEL_REGION ?? "-")}
          {row(t("Versi Node"), process.version)}
          {row(t("Versi terpasang"), sha ?? "-")}
          {row(t("Batas bandwidth"), `${VERCEL_BANDWIDTH_GB} GB / ${t("bulan")}`)}
          <p className="mt-2 text-[12px] leading-5 text-neutral-500">{t("Paket Hobby hanya untuk pemakaian non-komersial. Pantau bandwidth dan jumlah pemanggilan fungsi di dasbor.")}</p>
          {link("https://vercel.com/dashboard", t("Buka dasbor Vercel"))}
        </Card>

        <Card>
          <CardHeader icon={<Cloud />} title={HOST.r2} subtitle={t("Penyimpanan berkas")} />
          {row(t("Terpakai"), st ? `${size(st.bytes)} / ${size(STORAGE_LIMIT_MB * MB)}` : "-")}
          {row(t("Jumlah berkas"), st ? st.count.toLocaleString("id-ID") : "-")}
          {row(t("Rata-rata per berkas"), st && st.count ? size(st.bytes / st.count) : "-")}
          {row(t("Batas operasi tulis, baca"), `${R2_WRITE_OPS}, ${R2_READ_OPS} / ${t("bulan")}`)}
          {row(t("Perkiraan muat (sampai 80%)"), r2Room === null ? t("Butuh 10 proyek") : `${r2Room.toLocaleString("id-ID")} ${t("proyek lagi")}`)}
          <p className="mt-2 text-[12px] leading-5 text-neutral-500">{t("Transfer keluar R2 gratis. Jumlah operasi bulan ini hanya terlihat di dasbor Cloudflare.")}</p>
          {link("https://dash.cloudflare.com", t("Buka dasbor Cloudflare"))}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title={t("Pembersihan")} subtitle={t("Hapus data yang tidak lagi dipakai supaya database dan penyimpanan tidak membengkak.")} />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-[13px] text-neutral-600">{t("Order yang ditinggalkan, notifikasi dan log lama, serta undangan yang kedaluwarsa.")}</p>
          <PurgeButton />
        </div>
        <OrphanFiles />
      </Card>
    </>
  );
}
