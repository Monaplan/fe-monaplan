"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Link2, RefreshCw, Unplug } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/dialogs";
import { formatDateCompact, formatTime } from "@/lib/format";
import { disconnectGoogle, enableProjectSync, setGoogleAutoSync, stopProjectSync, syncGoogleNow } from "@/features/google/actions";

export type GoogleUiStatus = {
  configured: boolean;
  linked: { email: string | null; connectedAt: string } | null;
  sync: { autoSync: boolean; lastSyncedAt: string | null; lastStatus: string | null; lastMessage: string | null } | null;
};

// Pesan setelah kembali dari Google (parameter ?google= di URL)
const FLASH: Record<string, { text: string; tone: "positive" | "danger" }> = {
  ok: { text: "Google Calendar tersambung dan jadwalmu sudah tersinkron.", tone: "positive" },
  partial: { text: "Google Calendar tersambung, tetapi sebagian jadwal belum berhasil disinkronkan. Buka Google Calendar untuk detailnya.", tone: "danger" },
  denied: { text: "Izin ke Google dibatalkan. Tidak ada yang berubah.", tone: "danger" },
  scope: { text: "Izin kalender tidak diberikan. Centang akses kalender saat Google memintanya.", tone: "danger" },
  norefresh: { text: "Google tidak memberi izin jangka panjang. Coba hubungkan lagi.", tone: "danger" },
  not_configured: { text: "Google Calendar belum diaktifkan di server ini.", tone: "danger" },
  error: { text: "Gagal menyambungkan Google Calendar. Coba lagi sebentar lagi.", tone: "danger" },
};

export function GoogleCalendarButton({ projectId, tz, status, flash }: { projectId: string; tz: string; status: GoogleUiStatus; flash?: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const connected = !!status.linked && !!status.sync;

  useEffect(() => {
    const f = flash ? FLASH[flash] : null;
    if (!f) return;
    toast(f.text, f.tone);
    setOpen(true);
    // Bersihkan parameter agar pesan tidak muncul lagi saat dimuat ulang
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast(r.message ?? "Tersimpan."); router.refresh(); }
      else toast(r.error ?? "Gagal.", "danger");
    });

  const last = status.sync?.lastSyncedAt;
  const hasError = status.sync?.lastStatus === "error";

  return (
    <>
      <Button variant="outline" icon={<CalendarMark />} onClick={() => setOpen(true)}>
        Google Calendar
        {connected && <span aria-hidden="true" className={hasError ? "size-2 rounded-full bg-danger" : "size-2 rounded-full bg-positive"} />}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Google Calendar" description="Tampilkan tugas, pembayaran, acara, dan agenda proyek ini di kalender Google kamu.">
        {!status.configured ? (
          <p className="flex gap-3 rounded-xl bg-caution-bg p-4 text-[13px] leading-5 text-caution">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>Fitur ini belum diaktifkan di server. Admin perlu mengisi <b>GOOGLE_CLIENT_ID</b> dan <b>GOOGLE_CLIENT_SECRET</b>, lalu memulai ulang aplikasi.</span>
          </p>
        ) : !status.linked ? (
          <div className="flex flex-col gap-5">
            <ul className="list-disc space-y-2 pl-5 text-[13.5px] leading-5 text-neutral-700">
              <li>Monaplan membuat kalender terpisah bernama <b>Monaplan</b>, jadi kalender pribadimu tidak tersentuh.</li>
              <li>Satu arah: perubahan dari Monaplan muncul di Google. Mengubah event di Google tidak mengubah Monaplan.</li>
              <li>Izin yang diminta hanya untuk kalender dan event buatan Monaplan. Bisa diputus kapan saja.</li>
            </ul>
            <ButtonLink href={`/api/google/connect?project=${projectId}`} size="lg" icon={<Link2 />} className="w-full">Hubungkan Google Calendar</ButtonLink>
          </div>
        ) : !status.sync ? (
          <div className="flex flex-col gap-5">
            <p className="flex items-center gap-2 text-[13.5px] text-neutral-700"><CircleCheck className="size-4 text-positive" />Tersambung sebagai <b>{status.linked.email ?? "akun Google"}</b></p>
            <p className="text-[13.5px] leading-5 text-neutral-600">Proyek ini belum disinkronkan. Mulai sekarang untuk membuat kalender Monaplan di akun Google tersebut.</p>
            <Button size="lg" loading={pending} icon={<RefreshCw />} onClick={() => run(() => enableProjectSync(projectId))}>Sinkronkan proyek ini</Button>
            <Button variant="ghost" className="text-danger" icon={<Unplug />} disabled={pending} onClick={async () => { if (await confirm({ title: "Putuskan Google Calendar?", body: "Izin ke akun Google dicabut dan semua sinkronisasi berhenti. Event yang sudah ada di Google tidak dihapus.", confirmLabel: "Putuskan", tone: "danger" })) run(() => disconnectGoogle(projectId)); }}>Putuskan akun Google</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="flex items-center gap-2 text-[13.5px] text-neutral-700"><CircleCheck className="size-4 text-positive" />Tersambung sebagai <b>{status.linked.email ?? "akun Google"}</b></p>

            <div className={hasError ? "rounded-xl bg-danger-bg p-3.5 text-[13px] leading-5 text-danger" : "rounded-xl bg-neutral-50 p-3.5 text-[13px] leading-5 text-neutral-700"}>
              <p className="font-medium">{last ? `Terakhir sinkron ${formatDateCompact(last, tz)} ${formatTime(last, tz)}` : "Belum pernah disinkronkan"}</p>
              {status.sync.lastMessage && <p className="mt-0.5">{status.sync.lastMessage}</p>}
            </div>

            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-[13.5px] font-medium text-neutral-900">Sinkron otomatis</span>
                <span className="block text-[13px] leading-5 text-neutral-600">Perubahan tugas, pembayaran, acara, dan agenda langsung dikirim ke Google.</span>
              </span>
              <Switch label="Sinkron otomatis" checked={status.sync.autoSync} disabled={pending} onChange={(v) => run(() => setGoogleAutoSync(projectId, v))} />
            </label>

            <Button size="lg" loading={pending} icon={<RefreshCw />} onClick={() => run(() => syncGoogleNow(projectId))}>Sinkronkan sekarang</Button>
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="ghost" disabled={pending} onClick={async () => { if (await confirm({ title: "Hentikan sinkron proyek ini?", body: "Event yang sudah ada di Google tidak dihapus.", confirmLabel: "Hentikan" })) run(() => stopProjectSync(projectId)); }}>Hentikan untuk proyek ini</Button>
              <Button variant="ghost" className="text-danger" icon={<Unplug />} disabled={pending} onClick={async () => { if (await confirm({ title: "Putuskan Google Calendar?", body: "Izin ke akun Google dicabut dan semua sinkronisasi berhenti. Event yang sudah ada di Google tidak dihapus.", confirmLabel: "Putuskan", tone: "danger" })) run(() => disconnectGoogle(projectId)); }}>Putuskan akun Google</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// Ikon Google Calendar: kotak putih bertepi biru, kuning, hijau, dan merah dengan angka 31
function CalendarMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <defs><clipPath id="gcal-clip"><rect x="2" y="2" width="20" height="20" rx="3" /></clipPath></defs>
      <g clipPath="url(#gcal-clip)">
        <rect x="2" y="2" width="20" height="20" fill="#fff" />
        <rect x="2" y="2" width="20" height="5" fill="#4285F4" />
        <rect x="2" y="2" width="5" height="20" fill="#4285F4" />
        <rect x="18" y="7" width="4" height="11" fill="#FBBC04" />
        <rect x="7" y="18" width="11" height="4" fill="#34A853" />
        <polygon points="18,22 22,18 22,22" fill="#EA4335" />
        <polygon points="18,18 22,18 18,22" fill="#188038" />
      </g>
      <rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="#DADCE0" strokeWidth="0.6" />
      <text x="12.5" y="16.2" textAnchor="middle" fontSize="8.5" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif" fill="#4285F4">31</text>
    </svg>
  );
}
