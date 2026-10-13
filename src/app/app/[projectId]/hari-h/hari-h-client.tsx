"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { HandCoins } from "lucide-react";
import { HariHView } from "@/components/app/hari-h-view";
import { ProductTour } from "@/components/app/product-tour";
import { useProjectBase } from "@/components/app/project-base";
import type { CheckinAdapter } from "@/components/app/checkin-panel";
import { InstallHint } from "@/components/app/push-card";
import { setTaskStatus } from "@/features/checklist/actions";
import { checkinGuestAction, loadCheckinGuests, walkInAction } from "@/features/guests/checkin-actions";
import { TOURS } from "@/content/tours";
import { useT } from "@/i18n/client";
import type { DayData } from "@/lib/hari-h";

// Panel check-in (beserta pemindai) baru dimuat saat tombol Pindai QR ditekan
const CheckinPanel = dynamic(() => import("@/components/app/checkin-panel").then((m) => m.CheckinPanel), { ssr: false });

export function HariHClient({ projectId, data, canWrite }: { projectId: string; data: DayData; canWrite: boolean }) {
  const t = useT();
  const base = useProjectBase();
  const [scan, setScan] = useState(false);
  const adapter = useMemo<CheckinAdapter>(() => ({
    list: () => loadCheckinGuests(projectId),
    checkin: async (code, pax) => {
      const r = await checkinGuestAction(projectId, code, pax);
      return r.ok ? { ok: true, result: r.data } : { ok: false, error: r.error };
    },
    walkIn: async (name, pax) => {
      const r = await walkInAction(projectId, name, pax);
      return r.ok ? { ok: true, result: r.data } : { ok: false, error: r.error };
    },
  }), [projectId]);

  return (
    <>
      <ProductTour id="harih" steps={TOURS["harih"]!} />
      <InstallHint className="mx-auto mb-4 max-w-3xl" />
      <HariHView
        data={data}
        header={<h1 data-tour="harih-header" className="text-[22px] leading-8 font-semibold text-neutral-900 md:text-[26px]">{t("Mode Hari H")}</h1>}
        onToggleTask={canWrite ? async (id, done) => (await setTaskStatus(projectId, id, done ? "done" : "todo")).ok : undefined}
        rundownHref={`${base}/rundown`}
        checkin={canWrite && data.attendance ? { open: () => setScan(true) } : null}
        extra={
          <Link href={`${base}/amplop-kado`} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-surface p-4 hover:bg-plum-50">
            <HandCoins className="size-5 text-plum-600" />
            <span className="flex-1 text-[14px] font-semibold text-neutral-900">{t("Catat amplop dan kado")}</span>
            <span className="text-[13px] font-semibold text-plum-600">{t("Buka")}</span>
          </Link>
        }
      />
      {scan && <CheckinPanel adapter={adapter} tz={data.tz} onClose={() => setScan(false)} />}
    </>
  );
}
