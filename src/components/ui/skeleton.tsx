import { cn } from "./cn";
import { getI18n } from "@/i18n/server";

// Kerangka konten saat halaman dimuat: bentuknya meniru isi halaman agar tidak ada lompatan tata letak
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton rounded-xl", className)} />;
}

export async function PageSkeleton({ stats = 4, rows = 5 }: { stats?: number; rows?: number }) {
  const { t } = await getI18n();
  return (
    <div role="status" aria-label={t("Memuat")} aria-busy="true">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {stats > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: stats }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      )}
      <div className="rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-card">
        <Skeleton className="mb-5 h-5 w-40" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-[10px]" />
              <div className="flex flex-1 flex-col gap-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">{t("Memuat halaman")}</span>
    </div>
  );
}
