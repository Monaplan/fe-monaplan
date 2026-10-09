import { ArrowRight, Check } from "lucide-react";
import { getProjectContext } from "@/lib/access";
import { getGuideStatus } from "@/lib/guide";
import { ButtonLink } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-form";
import { Card, PageHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/components/ui/cn";
import { formatPercent } from "@/lib/format";
import { setGuideStep } from "@/features/project/guide-actions";

export const metadata = { title: "Panduan Penggunaan" };

export default async function GuidePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { supabase, project, canWrite } = await getProjectContext(projectId);
  const { steps, done, total } = await getGuideStatus(supabase, project);

  return (
    <>
      <PageHeader title="Panduan Penggunaan" description="Delapan langkah berurutan. Tanda selesai muncul otomatis saat syaratnya terpenuhi." />
      <Card className="mb-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold">Progres panduan</span>
          <span className="tabular text-[13px] text-neutral-600">{done}/{total} · <b className="text-neutral-900">{formatPercent(done / total)}</b></span>
        </div>
        <ProgressBar value={done / total} />
      </Card>

      <Card>
        <ol className="relative">
          {steps.map((s, i) => (
            <li key={s.key} className="relative flex gap-4 pb-8 last:pb-0">
              {i < steps.length - 1 && <span className={cn("absolute top-10 left-[19px] h-[calc(100%-40px)] w-0.5", s.done ? "bg-plum-600" : "bg-neutral-200")} />}
              <span className={cn("relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                s.done ? "border-plum-600 bg-plum-600 text-white" : "border-neutral-200 bg-surface text-neutral-600")}>
                {s.done ? <Check className="animate-check size-5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1 pt-1.5">
                <h3 className={cn("text-base font-semibold", s.done ? "text-plum-700" : "text-neutral-800")}>{s.title}</h3>
                <p className="mt-1 max-w-2xl text-[13px] leading-5 text-neutral-600">{s.body}</p>
                <p className="mt-1 text-xs text-neutral-500">Selesai bila: {s.rule}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ButtonLink href={`/w/${projectId}/${s.path}`} size="sm" variant={s.done ? "secondary" : "primary"} icon={<ArrowRight />}>{s.cta}</ButtonLink>
                  {canWrite && !s.done && <ActionButton size="sm" variant="ghost" action={setGuideStep.bind(null, projectId, s.key, true)}>Tandai selesai</ActionButton>}
                  {canWrite && s.manual && <ActionButton size="sm" variant="ghost" action={setGuideStep.bind(null, projectId, s.key, false)}>Batalkan tanda</ActionButton>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
