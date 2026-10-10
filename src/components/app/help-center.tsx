"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LifeBuoy, MessageCircle, Play, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { supportWhatsappUrl } from "@/lib/support";
import { HELP_CATEGORIES, HELP_FAQ, HELP_TOURS } from "@/content/help";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useI18n } from "@/i18n/client";

export function HelpCenter({ base }: { base: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return HELP_FAQ.filter((f) => (!cat || f.cat === cat) && (!needle || `${f.q[lang]} ${f.a[lang]}`.toLowerCase().includes(needle)));
  }, [q, cat, lang]);

  const wa = supportWhatsappUrl(`Halo admin Monaplan, saya butuh bantuan.\nHalaman: ${pathname}`);
  const tours = HELP_TOURS.filter((x) => (x.scope === "app" ? !!base : true));
  const goTour = (id: string, path: string, scope: "app" | "akun") => {
    try { localStorage.removeItem(`mp-tour:v1:${id}`); } catch {}
    router.push(scope === "akun" ? path : path ? `${base}/${path}` : base!);
  };
  const resetAll = () => {
    try { for (const x of HELP_TOURS) localStorage.removeItem(`mp-tour:v1:${x.id}`); } catch {}
    toast(t("Semua tur akan tampil lagi saat kamu membuka halamannya."));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <ProductTour id="bantuan" steps={TOURS.bantuan!} />
      <div className="flex flex-col gap-4">
        <Card tour="help-faq">
          <CardHeader icon={<LifeBuoy />} title={t("Pertanyaan umum")} />
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Cari pertanyaan")} aria-label={t("Cari pertanyaan")} className="pl-10" />
          </div>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t("Kategori")}>
            {[{ key: null as string | null, label: t("Semua") }, ...HELP_CATEGORIES.map((c) => ({ key: c.key as string | null, label: c.label[lang] }))].map((c) => (
              <button key={c.label} onClick={() => setCat(c.key)} aria-pressed={cat === c.key}
                className={cn("h-10 rounded-full px-3.5 text-[13px] md:h-8 font-medium transition-colors", cat === c.key ? "bg-plum-600 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200")}>
                {c.label}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-neutral-500">{t("Tidak ada yang cocok. Coba kata lain atau chat admin di samping.")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {list.map((f) => (
                <details key={f.q.id} className="group rounded-xl border border-neutral-200 bg-surface px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-medium text-neutral-900">
                    {f.q[lang]}
                    <span aria-hidden="true" className="text-plum-600 transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-[13.5px] leading-6 text-neutral-600">{f.a[lang]}</p>
                </details>
              ))}
            </div>
          )}
        </Card>

        <Card tour="help-tours">
          <CardHeader icon={<Play />} title={t("Tur halaman")} subtitle={t("Pilih satu untuk memutarnya lagi.")}
            action={<Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={resetAll}>{t("Ulangi semua tur")}</Button>} />
          <ul className="grid gap-2 sm:grid-cols-2">
            {tours.map((x) => (
              <li key={x.id}>
                <button onClick={() => goTour(x.id, x.path, x.scope)}
                  className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-surface px-3.5 text-left text-[13.5px] font-medium text-neutral-800 transition-colors hover:border-plum-300 hover:bg-plum-50">
                  <span className="truncate">{x.label[lang]}</span>
                  <span className="shrink-0 text-xs font-medium text-plum-600">{t("Mulai tur")}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card tour="help-contact">
          <CardHeader icon={<MessageCircle />} title={t("Hubungi kami")} subtitle={t("Chat langsung dengan admin Monaplan.")} />
          {wa ? (
            <>
              <p className="text-[13.5px] leading-6 text-neutral-600">{t("Tidak ketemu jawabannya? Ceritakan kendalamu lewat WhatsApp, kami bantu secepatnya di jam kerja.")}</p>
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="hover-lift mt-4 flex items-center gap-3 rounded-2xl border border-[#1FA855]/30 bg-[#1FA855]/10 p-4 text-neutral-900">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1FA855] text-white"><MessageCircle className="size-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t("Chat WhatsApp admin")}</span><span className="block text-xs text-neutral-600">{t("Balasan lebih cepat di jam kerja.")}</span></span>
              </a>
            </>
          ) : (
            <p className="text-[13.5px] leading-6 text-neutral-600">{t("Kontak admin belum diatur. Silakan coba lagi nanti.")}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
