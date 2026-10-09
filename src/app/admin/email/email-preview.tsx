"use client";

import { useState, useTransition } from "react";
import { CircleAlert, Monitor, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { EMAIL_KINDS, EMAIL_LABEL, type EmailKind, type Lang } from "@/lib/email/templates";
import { sendTestEmail } from "@/features/admin/email-actions";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useT, useLang } from "@/i18n/client";

export type PreviewMap = Record<EmailKind, Record<Lang, { subject: string; html: string; text: string }>>;

export function EmailPreview({ previews, from, configured }: { previews: PreviewMap; from: string; configured: boolean }) {
  const t = useT();
  const toast = useToast();
  const [kind, setKind] = useState<EmailKind>("agenda_reminder");
  const ui = useLang();
  const [lang, setLang] = useState<Lang>(ui);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [pending, start] = useTransition();
  const p = previews[kind][lang];

  return (
    <>
      <ProductTour id="admin-email" steps={TOURS["admin-email"]!} />
      <PageHeader tour="admin-email" title={t("Email")} description={t("Pratinjau email yang dikirim lewat Resend. Kirim contoh ke emailmu untuk memeriksanya.")} />

      {!configured && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("RESEND_API_KEY belum diisi, jadi email belum terkirim. Pratinjau tetap bisa dilihat.")}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card tour="admin-email-main" className="h-fit p-2 sm:p-2">
          <ul className="flex flex-col gap-0.5" aria-label={t("Jenis email")}>
            {EMAIL_KINDS.map((k) => (
              <li key={k}>
                <button onClick={() => setKind(k)} aria-pressed={k === kind}
                  className={cn("flex h-10 w-full items-center rounded-xl px-3 text-left text-[13.5px] font-medium transition-colors", k === kind ? "bg-plum-50 text-plum-700 ring-1 ring-plum-100" : "text-neutral-700 hover:bg-neutral-100")}>
                  {EMAIL_LABEL[k][lang]}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Segmented items={[{ key: "id", label: t("Indonesia") }, { key: "en", label: t("English") }]} value={lang} onChange={setLang} />
            <Segmented items={[{ key: "desktop", label: <Monitor className="size-4" aria-label={t("Desktop")} /> }, { key: "mobile", label: <Smartphone className="size-4" aria-label={t("HP")} /> }]} value={device} onChange={setDevice} />
            <Button className="ml-auto" icon={<Send />} loading={pending} disabled={!configured}
              onClick={() => start(async () => { const r = await sendTestEmail(kind, lang); toast(r.ok ? (r.message ?? "Terkirim.") : r.error, r.ok ? "positive" : "danger"); })}>{t("Kirim contoh ke emailku")}</Button>
          </div>

          <dl className="mb-3 grid gap-1 rounded-xl bg-neutral-50 px-4 py-3 text-[13px]">
            <div className="flex gap-3"><dt className="w-14 shrink-0 text-neutral-500">{t("Dari")}</dt><dd className="min-w-0 truncate">{from}</dd></div>
            <div className="flex gap-3"><dt className="w-14 shrink-0 text-neutral-500">{t("Subjek")}</dt><dd className="min-w-0 font-medium">{p.subject}</dd></div>
          </dl>

          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-[#FBF5F8]">
            <iframe title={t("Pratinjau {v1}", { v1: EMAIL_LABEL[kind][lang] })} srcDoc={p.html} sandbox=""
              className={cn("mx-auto block h-[560px] bg-[#FBF5F8] transition-[width] duration-200", device === "mobile" ? "w-[375px] max-w-full" : "w-full")} />
          </div>

          <details className="mt-3 text-[13px] text-neutral-600">
            <summary className="cursor-pointer font-medium text-neutral-700">{t("Versi teks biasa")}</summary>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-xs leading-5 whitespace-pre-wrap">{p.text}</pre>
          </details>
        </Card>
      </div>
    </>
  );
}
