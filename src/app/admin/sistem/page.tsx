import { Database, FileText, HardDrive } from "lucide-react";
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

  const [dbRes, storage, documents, tasks, review, notifications] = await Promise.all([
    admin.rpc("admin_system_stats"),
    storageStats(admin),
    count("documents"), count("tasks"),
    count("orders", (q) => q.eq("needs_review", true)), count("notifications"),
  ]);

  const db = dbRes.error ? null : (dbRes.data as { db_bytes: number; connections: number; tables: { name: string; bytes: number; rows: number }[] });
  const dbRatio = db ? db.db_bytes / MB / DB_LIMIT_MB : 0;
  const st = storage && !("error" in storage) ? storage : null;
  const stRatio = st ? st.bytes / MB / STORAGE_LIMIT_MB : 0;

  const services: [string, boolean, string?][] = [
    ["Midtrans", !!process.env.MIDTRANS_SERVER_KEY, process.env.MIDTRANS_IS_PRODUCTION === "true" ? t("Produksi") : t("Sandbox")],
    ["Email (Resend)", !!process.env.RESEND_API_KEY],
    ["Cloudflare R2", storageDriver() === "r2"],
    ["Google Calendar", !!process.env.GOOGLE_CLIENT_ID],
    [t("Pengingat terjadwal (cron)"), !!process.env.CRON_SECRET, t("Email dan notifikasi pengingat")],
    [t("WhatsApp bantuan"), !!process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP],
  ];
  const content: [string, number][] = [
    [t("Dokumen terunggah"), documents], [t("Tugas"), tasks], [t("Notifikasi tersimpan"), notifications], [t("Order perlu ditinjau"), review],
  ];

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
