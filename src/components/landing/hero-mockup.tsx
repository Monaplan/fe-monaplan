import { Bell, Check, LayoutGrid, ListChecks, Mail, Store, Wallet } from "lucide-react";
import { getT } from "@/i18n/server";

// Nama dan inisial contoh bukan teks antarmuka, jadi tidak diterjemahkan
const COUPLE = "Raka & Nadia";
const GUEST_INITIALS = "IS";

// Cuplikan aplikasi untuk hero, dibuat dari HTML dan CSS (tanpa gambar) supaya ringan dan ikut tema terang/gelap.
// Datanya karangan dan hanya hiasan, jadi disembunyikan dari pembaca layar.
export async function HeroMockup() {
  const t = await getT();
  const tasks = [
    { label: t("Survei dan booking venue"), done: true },
    { label: t("Pilih busana dan MUA"), done: true },
    { label: t("Booking fotografer"), done: false },
  ];
  const bars = [28, 44, 36, 62, 48, 74, 56, 88];

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[560px] pb-10 lg:max-w-none">
      {/* Jendela aplikasi */}
      <div className="animate-sheet-in overflow-hidden rounded-2xl border border-neutral-200/80 bg-surface shadow-modal">
        <div className="flex items-center gap-1.5 border-b border-neutral-200/70 bg-neutral-50 px-3.5 py-2.5">
          <span className="size-2.5 rounded-full bg-[#F0B7B7]" /><span className="size-2.5 rounded-full bg-[#F1D7A6]" /><span className="size-2.5 rounded-full bg-[#BFD9B8]" />
          <span className="ml-3 h-5 flex-1 rounded-full bg-neutral-100 px-3 text-[10px] leading-5 text-neutral-400">{t("monaplan / raka-nadia")}</span>
        </div>
        <div className="grid grid-cols-[46px_1fr]">
          <div className="flex flex-col items-center gap-3 border-r border-neutral-200/70 bg-neutral-50/60 py-4 text-neutral-400 [&_svg]:size-4">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-plum-100 text-plum-700"><LayoutGrid /></span>
            <ListChecks /><Wallet /><Store /><Mail />
          </div>
          <div className="p-4">
            <p className="text-[13px] font-semibold text-neutral-900">{t("Halo,")} <span className="font-display text-[15px] text-plum-600 italic">{COUPLE}</span></p>
            <div className="mt-3 grid grid-cols-5 gap-2.5">
              <div className="col-span-3 rounded-xl border border-neutral-200/70 p-3">
                <p className="text-[10px] font-medium text-neutral-500">{t("Hitung mundur")}</p>
                <p className="mt-1 font-display text-[30px] leading-8 font-medium text-neutral-900 [font-variant-numeric:lining-nums]">127 <span className="text-[16px]">{t("hari lagi")}</span></p>
                <p className="mt-1 text-[10px] text-neutral-500">{t("Sabtu, 13 Maret 2027")}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-neutral-200/70 p-3">
                <p className="text-[10px] font-medium text-neutral-500">{t("Budget terpakai")}</p>
                <p className="tabular mt-1 text-[15px] leading-6 font-semibold text-neutral-900">56%</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-plum-100"><div className="h-full w-[56%] rounded-full bg-plum-600" /></div>
              </div>
              <div className="col-span-3 rounded-xl border border-neutral-200/70 p-3">
                <p className="mb-2 text-[10px] font-medium text-neutral-500">{t("Tugas minggu ini")}</p>
                <ul className="space-y-1.5">
                  {tasks.map((x) => (
                    <li key={x.label} className="flex items-center gap-2 text-[11px] text-neutral-700">
                      <span className={x.done ? "inline-flex size-3.5 items-center justify-center rounded-full bg-plum-600 text-white" : "size-3.5 rounded-full border border-neutral-300"}>{x.done && <Check className="size-2.5" />}</span>
                      <span className={x.done ? "text-neutral-400 line-through" : ""}>{x.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-2 flex items-end gap-1 rounded-xl border border-neutral-200/70 p-3">
                {bars.map((h, i) => <span key={i} className={i === bars.length - 1 ? "w-full rounded-t bg-plum-600" : "w-full rounded-t bg-plum-200"} style={{ height: `${h * 0.6}px` }} />)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ponsel */}
      <div className="animate-float-slow absolute -right-2 -bottom-2 hidden w-[148px] rounded-[26px] border-[5px] border-neutral-800 bg-surface p-3 shadow-modal sm:block lg:-right-6">
        <p className="text-[10px] font-semibold text-neutral-900">{t("Checklist")}</p>
        <ul className="mt-2 space-y-2">
          {[t("Cincin"), t("Katering"), t("Undangan"), t("Dokumen KUA")].map((x, i) => (
            <li key={x} className="flex items-center gap-2 text-[10px] text-neutral-700">
              <span className={i < 2 ? "inline-flex size-3 items-center justify-center rounded-full bg-plum-600 text-white" : "size-3 rounded-full border border-neutral-300"}>{i < 2 && <Check className="size-2" />}</span>{x}
            </li>
          ))}
        </ul>
        <div className="mt-3 h-6 rounded-full bg-plum-600" />
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
