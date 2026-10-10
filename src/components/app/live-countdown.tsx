"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";

const pad = (n: number) => String(n).padStart(2, "0");

// Sisa waktu yang berdetak tiap detik: "2 hari 05:12:33". Saat waktu habis halaman dimuat ulang sekali agar status akses ikut berubah.
// Teks awal dihitung dari jam peramban, jadi selisih satu detik dengan HTML server tidak dianggap galat.
export function LiveCountdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const end = Date.parse(endsAt);
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const l = Math.max(0, end - Date.now());
      setLeft(l);
      if (l === 0 && !fired) { fired = true; router.refresh(); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [end, router]);

  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (
    <span className={className} suppressHydrationWarning>
      {d > 0 && <>{d} {t("hari")} </>}
      <span className="tabular" suppressHydrationWarning>{pad(h)}:{pad(m)}:{pad(sec)}</span>
    </span>
  );
}
