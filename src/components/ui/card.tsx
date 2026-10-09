import type { ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, children, id, tour }: { className?: string; children: ReactNode; id?: string; tour?: string }) {
  return (
    <section id={id} data-tour={tour} className={cn("rounded-2xl border border-neutral-200/80 bg-surface p-4 shadow-card sm:p-5", className)}>
      {children}
    </section>
  );
}

export function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-plum-50 text-plum-600 ring-1 ring-plum-100 [&_svg]:size-[18px]", className)}>
      {children}
    </span>
  );
}

export function CardHeader({ icon, title, action, subtitle }: { icon?: ReactNode; title: ReactNode; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {icon && <IconTile>{icon}</IconTile>}
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] leading-6 font-semibold text-neutral-900">{title}</h3>
        {subtitle && <p className="text-[13px] leading-5 text-neutral-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow, children, tour }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; children?: ReactNode; tour?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0" data-tour={tour ? `${tour}-header` : undefined}>
        {eyebrow && <p className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-plum-600 uppercase">{eyebrow}</p>}
        <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.01em] text-neutral-900 md:text-[28px] md:leading-9">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] leading-[22px] text-neutral-600">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2" data-tour={tour ? `${tour}-actions` : undefined}>{actions}</div>}
    </div>
  );
}

export function StatCard({ icon, title, value, footer, className, tour }: { icon?: ReactNode; title: string; value: ReactNode; footer?: ReactNode; className?: string; tour?: string }) {
  return (
    <Card tour={tour} className={cn("relative overflow-hidden", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-medium text-neutral-600">{title}</h3>
        {icon && <IconTile className="size-8 rounded-[9px] [&_svg]:size-4">{icon}</IconTile>}
      </div>
      <div className="tabular text-[24px] leading-8 font-bold tracking-[-0.02em] text-neutral-900 md:text-[28px] md:leading-9">{value}</div>
      {footer && <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-neutral-500">{footer}</div>}
    </Card>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <span className="relative mb-5 inline-flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-plum-50 to-plum-100 text-plum-600 ring-1 ring-plum-100 [&_svg]:size-7">
        {icon}
        <span className="absolute -top-1 -right-1 size-3 rounded-full bg-plum-300" />
      </span>
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-5 text-neutral-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
