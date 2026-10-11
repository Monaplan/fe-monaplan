import { Bell, LayoutGrid, ListChecks, Mail, Store, Users, Wallet } from "lucide-react";
import { getT } from "@/i18n/server";
import { LogoMark } from "@/components/app/logo-mark";
import { formatIDRShort } from "@/lib/format";

// Nama dan inisial contoh bukan teks antarmuka, jadi tidak diterjemahkan
const COUPLE = "Raka & Nadia";
const GUEST_INITIALS = "IS";
const RING = 2 * Math.PI * 21;

// Cuplikan dashboard untuk hero, dibuat dari HTML dan CSS (tanpa gambar) supaya ringan dan ikut tema terang/gelap.
// Susunannya meniru dashboard asli (sidebar bermenu, kartu hitung mundur bercincin, ringkasan budget dan tamu, grafik, progress fase).
// Datanya karangan dan hanya hiasan, jadi disembunyikan dari pembaca layar.
export async function HeroMockup() {
  const t = await getT();
  const bars = [0, 0, 22, 38, 0, 30, 46, 40, 58, 74, 0, 0];
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const menu = [
    { icon: <LayoutGrid />, label: t("Dashboard"), active: true },
    { icon: <ListChecks />, label: t("To Do Checklist") },
    { icon: <Wallet />, label: t("Budgeting") },
    { icon: <Store />, label: t("Kelola Vendor") },
    { icon: <Mail />, label: t("Tamu & RSVP") },
  ];
  const phases = [
    { label: t("> 12 bln"), value: 100 },
    { label: t("12–6 bln"), value: 62 },
    { label: t("6–3 bln"), value: 25 },
  ];

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[560px] pb-10 lg:max-w-none">
      {/* Jendela aplikasi */}
      <div className="animate-sheet-in overflow-hidden rounded-2xl border border-neutral-200/80 bg-surface shadow-modal">
        <div className="flex items-center gap-1.5 border-b border-neutral-200/70 bg-neutral-50 px-3.5 py-2.5">
          <span className="size-2.5 rounded-full bg-[#F0B7B7]" /><span className="size-2.5 rounded-full bg-[#F1D7A6]" /><span className="size-2.5 rounded-full bg-[#BFD9B8]" />
          <span className="ml-3 h-5 flex-1 rounded-full bg-neutral-100 px-3 text-[10px] leading-5 text-neutral-500">{t("monaplan / raka-nadia")}</span>
        </div>
        <div className="grid grid-cols-[44px_1fr] sm:grid-cols-[148px_1fr]">
          {/* Sidebar: logo dan menu seperti aplikasi asli */}
          <div className="border-r border-neutral-200/70 bg-neutral-50/60 px-2 py-3 sm:px-2.5">
            <div className="mb-3 flex items-center justify-center gap-1.5 sm:justify-start sm:px-1">
              <LogoMark className="size-6" />
              <span className="hidden font-display text-[15px] leading-4 font-semibold text-neutral-900 sm:block">Monaplan</span>
            </div>
            <ul className="flex flex-col gap-0.5 text-neutral-500 [&_svg]:size-3.5">
              {menu.map((m) => (
                <li key={m.label} className={m.active ? "flex h-7 items-center justify-center gap-2 rounded-lg bg-plum-50 text-plum-700 ring-1 ring-plum-100 sm:justify-start sm:px-2" : "flex h-7 items-center justify-center gap-2 sm:justify-start sm:px-2"}>
                  {m.icon}<span className="hidden truncate text-[10.5px] font-medium sm:block">{m.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 p-3.5">
            <p className="text-[13px] font-semibold text-neutral-900">{t("Halo,")} <span className="font-display text-[15px] text-plum-600 italic">{COUPLE}</span></p>
            <div className="mt-2.5 grid grid-cols-5 gap-2">
              {/* Hitung mundur */}
              <div className="brand-canvas relative col-span-3 overflow-hidden rounded-xl p-3 text-white">
                <span className="pointer-events-none absolute -top-10 -right-8 size-28 rounded-full border border-white/10" />
                <div className="relative flex items-center gap-3">
                  <div className="relative size-[52px] shrink-0">
                    <svg viewBox="0 0 52 52" className="size-full -rotate-90"><circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="4" /><circle cx="26" cy="26" r="21" fill="none" stroke="#F3C8DB" strokeWidth="4" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * 0.42} /></svg>
                    <span className="absolute inset-0 flex items-center justify-center font-display text-[17px] font-medium [font-variant-numeric:lining-nums]">127</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[8.5px] font-semibold tracking-[0.1em] text-[#EDD1DF] uppercase">{t("Hitung mundur")}</p>
                    <p className="mt-0.5 truncate text-[11px] font-medium">{t("Sabtu, 13 Maret 2027")}</p>
                    <p className="truncate text-[9.5px] text-white/70">{t("hari lagi")}</p>
                  </div>
                </div>
                <div className="relative mt-2.5 grid grid-cols-3 gap-1.5">
                  {[[4, t("bulan")], [1, t("minggu")], [0, t("hari")]].map(([n, l]) => (
                    <span key={l as string} className="rounded-lg bg-white/10 py-1 text-center ring-1 ring-white/10"><b className="block font-display text-[14px] leading-4 font-medium [font-variant-numeric:lining-nums]">{n}</b><i className="block text-[8.5px] not-italic text-white/70">{l}</i></span>
                  ))}
                </div>
              </div>
              {/* Ringkasan budget dan tamu */}
              <div className="col-span-2 flex flex-col gap-2">
                <div className="flex-1 rounded-xl border border-neutral-200/70 p-2.5">
                  <p className="text-[9.5px] font-medium text-neutral-500">{t("Budget terpakai")}</p>
                  <p className="tabular mt-0.5 text-[14px] leading-5 font-bold tracking-tight text-neutral-900">{formatIDRShort(84_000_000)}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-plum-100"><div className="h-full w-[56%] rounded-full bg-plum-600" /></div>
                </div>
                <div className="flex-1 rounded-xl border border-neutral-200/70 p-2.5">
                  <p className="flex items-center gap-1 text-[9.5px] font-medium text-neutral-500"><Users className="size-3" />{t("Tamu hadir")}</p>
                  <p className="tabular mt-0.5 text-[14px] leading-5 font-bold text-neutral-900">12 <span className="text-[10px] font-medium text-neutral-500">{t("orang")}</span></p>
                </div>
              </div>
              {/* Grafik pengeluaran */}
              <div className="col-span-3 rounded-xl border border-neutral-200/70 p-2.5">
                <p className="mb-1.5 text-[9.5px] font-medium text-neutral-500">{t("Ringkasan Pengeluaran")}</p>
                <div className="flex h-[46px] items-end gap-[3px]">
                  {bars.map((h, i) => <span key={i} className={i === 9 ? "w-full rounded-t bg-plum-600" : h ? "w-full rounded-t bg-plum-200" : "w-full rounded-t bg-plum-50"} style={{ height: `${Math.max(h, 6) * 0.6}px` }} />)}
                </div>
                <div className="mt-1 flex gap-[3px] text-[7.5px] text-neutral-400">{months.map((m, i) => <span key={i} className="w-full text-center">{m}</span>)}</div>
              </div>
              {/* Progress per fase */}
              <div className="col-span-2 rounded-xl border border-neutral-200/70 p-2.5">
                <p className="mb-1.5 text-[9.5px] font-medium text-neutral-500">{t("Progress per Fase")}</p>
                <ul className="space-y-1.5">
                  {phases.map((p) => (
                    <li key={p.label}>
                      <div className="flex justify-between text-[8.5px] text-neutral-500"><span>{p.label}</span><span className="tabular font-semibold text-neutral-700">{p.value}%</span></div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-plum-100"><div className="h-full rounded-full bg-plum-600" style={{ width: `${p.value}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kartu melayang */}
      <div className="animate-float absolute -top-4 right-2 flex items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-surface px-3 py-2 shadow-pop sm:right-6">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-plum-100 text-plum-700"><Bell className="size-4" /></span>
        <span><span className="block text-[12px] font-semibold text-neutral-900">{t("Pengingat DP vendor")}</span><span className="block text-[10.5px] text-neutral-500">{t("Besok jatuh tempo")}</span></span>
      </div>
      <div className="animate-float-slow absolute bottom-3 left-0 flex items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-surface px-3 py-2 shadow-pop sm:-left-5">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-plum-600 text-[11px] font-semibold text-white">{GUEST_INITIALS}</span>
        <span><span className="block text-[12px] font-semibold text-neutral-900">{t("Konfirmasi baru")}</span><span className="block text-[10.5px] text-neutral-500">{t("Ibu Sari hadir, 2 orang")}</span></span>
      </div>
    </div>
  );
}
