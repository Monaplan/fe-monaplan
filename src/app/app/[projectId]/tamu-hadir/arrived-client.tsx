"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, PartyPopper, Search, Undo2, UserCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/pill";
import { ProductTour } from "@/components/app/product-tour";
import { useProjectBase } from "@/components/app/project-base";
import { TOURS } from "@/content/tours";
import { undoCheckinAction } from "@/features/guests/checkin-actions";
import { PARTY_SIDE, labelOf } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { useI18n } from "@/i18n/client";

type Guest = {
  id: string; name: string; category: string; group: string | null; side?: string; pax_invited: number; pax_confirmed: number;
  checked_in_at: string | null; checked_in_pax: number | null; checked_in_by?: string | null;
};

// Daftar tamu yang sudah check-in (DESIGN.md 21.2). Data diurutkan menurut jam masuk dari server; di layar terbaru di atas.
export function ArrivedClient({ projectId, tz, canWrite, guests, expectedGuests, expectedPax }: {
  projectId: string; tz: string; canWrite: boolean; guests: Guest[]; expectedGuests: number; expectedPax: number;
}) {
  const { t, lang } = useI18n();
  const base = useProjectBase();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");

  const paxOf = (g: Guest) => g.checked_in_pax ?? g.pax_confirmed ?? g.pax_invited;
  const groups = useMemo(() => [...new Set(guests.map((g) => g.group).filter(Boolean) as string[])].sort(), [guests]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return guests.filter((g) => (!s || g.name.toLowerCase().includes(s)) && (!group || (group === "__none" ? !g.group : g.group === group))).slice().reverse();
  }, [guests, q, group]);

  const totalPax = guests.reduce((sum, g) => sum + paxOf(g), 0);
  const time = (iso: string | null) => (iso ? formatTime(iso, tz, false, lang) : "-");
  const first = guests[0]?.checked_in_at ?? null, last = guests[guests.length - 1]?.checked_in_at ?? null;

  return (
    <>
      <ProductTour id="tamuhadir" steps={TOURS["tamuhadir"]!} />
      <PageHeader tour="tamuhadir" title={t("Tamu Hadir")} description={t("Semua tamu yang sudah check-in di hari H, lengkap dengan jam masuk.")}
        actions={<div data-tour="tamuhadir-actions" className="flex flex-wrap items-center gap-2">
          <ButtonLink href={`${base}/hari-h`} variant="outline" icon={<PartyPopper />}>{t("Mode Hari H")}</ButtonLink>
          <ButtonLink href={`/api/export/${projectId}/tamu`} variant="outline" icon={<Download />} prefetch={false}>{t("Ekspor CSV")}</ButtonLink>
          <a href={`/api/export/${projectId}/tamu-hadir-pdf`} download className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-plum-900 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-plum-800 [&_svg]:size-4">
            <Download aria-hidden="true" />{t("Unduh PDF")}
          </a>
        </div>} />

      <div data-tour="tamuhadir-stats" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard title={t("Tamu hadir")} value={guests.length} footer={t("dari {n} yang konfirmasi", { n: expectedGuests })} />
        <StatCard title={t("Orang datang")} value={totalPax} footer={t("dari {n} pax konfirmasi", { n: expectedPax })} />
        <StatCard title={t("Check-in pertama")} value={time(first)} footer={t("jam masuk tamu pertama")} />
        <StatCard title={t("Check-in terakhir")} value={time(last)} footer={t("jam masuk tamu terakhir")} />
      </div>

      {guests.length === 0 ? (
        <Card>
          <EmptyState icon={<UserCheck />} title={t("Belum ada tamu yang check-in")} text={t("Tamu yang dipindai QR-nya di Mode Hari H akan muncul di sini.")}
            action={<Link href={`${base}/hari-h`} className="inline-flex h-10 items-center rounded-full bg-plum-900 px-5 text-[14px] font-semibold text-white hover:bg-plum-800">{t("Buka Mode Hari H")}</Link>} />
        </Card>
      ) : (
        <Card tour="tamuhadir-list" className="overflow-hidden p-0 sm:p-0">
          <div className="grid grid-cols-2 gap-2 border-b border-neutral-100 p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
              <Input placeholder={t("Cari nama tamu")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label={t("Cari nama tamu")} />
            </div>
            <Select value={group} onChange={(e) => setGroup(e.target.value)} aria-label={t("Filter grup")} className="col-span-2 lg:col-span-1">
              <option value="">{t("Semua grup")}</option>
              {groups.map((g) => <option key={g} value={g}>{g}</option>)}
              {guests.some((g) => !g.group) && <option value="__none">{t("Tanpa grup")}</option>}
            </Select>
          </div>

          <div className="hidden grid-cols-[48px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_64px_84px_minmax(0,1fr)_40px] items-center gap-3 bg-neutral-50 px-5 py-2.5 text-xs font-medium text-neutral-500 md:grid">
            <span>{t("No")}</span><span>{t("Nama")}</span><span>{t("Grup")}</span><span>{t("Pihak")}</span><span className="text-right">{t("Orang")}</span><span>{t("Masuk")}</span><span>{t("Petugas")}</span><span />
          </div>
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-neutral-500">{t("Tidak ada tamu yang cocok.")}</p>
          ) : (
            <ul>
              {list.map((g) => {
                const no = guests.length - guests.findIndex((x) => x.id === g.id);
                const menu = canWrite && (
                  <RowMenu items={[{ label: t("Batalkan check-in"), icon: <Undo2 />, danger: true, confirm: t("Batalkan check-in {name}?", { name: g.name }), action: () => undoCheckinAction(projectId, g.id) }]} />
                );
                return (
                  <li key={g.id} data-row-id={g.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-t border-neutral-100 px-4 py-3 sm:px-5 md:grid-cols-[48px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_64px_84px_minmax(0,1fr)_40px] md:items-center">
                    <span className="tabular hidden text-[13px] text-neutral-500 md:block">{no}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-neutral-900">{g.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-neutral-600 md:hidden">
                        {g.group && <span>{g.group}</span>}
                        <span className="tabular">{time(g.checked_in_at)} · {t("{n} orang", { n: paxOf(g) })}</span>
                        {g.category === "vip" && <StatusPill tone="caution" icon={false}>{t("VIP")}</StatusPill>}
                      </p>
                    </div>
                    <div className="col-start-2 row-start-1 md:hidden">{menu}</div>
                    <span className="hidden truncate text-[13px] text-neutral-600 md:block">{g.group ?? "-"}</span>
                    <span className="hidden truncate text-[13px] text-neutral-600 md:block">{g.side ? t(labelOf(PARTY_SIDE, g.side)) : "-"}</span>
                    <span className="tabular hidden text-right text-[14px] font-semibold text-neutral-900 md:block">{paxOf(g)}</span>
                    <span className="tabular hidden text-[13px] text-neutral-700 md:block">{time(g.checked_in_at)}</span>
                    <span className="hidden truncate text-[13px] text-neutral-600 md:block">{g.checked_in_by ?? "-"}</span>
                    <div className="hidden md:block">{menu}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
