"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/dialogs";
import { useProjectBase } from "@/components/app/project-base";
import { googleConnectRequired } from "@/features/google/actions";
import { useT } from "@/i18n/client";

// Sebelum mengisi tugas, pembayaran, atau agenda, pastikan Google Calendar tersambung. Bila belum, tampilkan popup
// lalu arahkan ke Kalender (yang menampilkan peringatan dan tombol sambung). Pemeriksaan gagal tidak menghalangi.
export function useGoogleGate(projectId: string, onCalendar = false) {
  const t = useT();
  const router = useRouter();
  const base = useProjectBase();
  const confirm = useConfirm();
  const [checking, setChecking] = useState(false);
  const guard = async (proceed: () => void) => {
    if (checking) return;
    setChecking(true);
    let required = false;
    try { required = await googleConnectRequired(projectId); } catch {}
    setChecking(false);
    if (!required) return proceed();
    const go = await confirm({
      title: t("Sambungkan Google Calendar dulu"),
      body: t("Supaya pengingat tanggal penting muncul langsung di HP-mu. Hanya sekali, setelah itu kamu bisa lanjut mengisi."),
      confirmLabel: t("Sambungkan sekarang"),
      cancelLabel: t("Nanti"),
    });
    if (!go) return;
    // Di Kalender langsung ke persetujuan Google; dari halaman lain ke Kalender yang menampilkan peringatan
    if (onCalendar) window.location.assign(`/api/google/connect?project=${projectId}`);
    else router.push(`${base}/kalender?sambung=1`);
  };
  return { guard, checking };
}
