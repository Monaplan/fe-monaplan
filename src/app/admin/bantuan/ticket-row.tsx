"use client";

import { useState } from "react";
import { ChevronDown, CircleCheck, Mail, RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { formatDateCompact, formatTime } from "@/lib/format";
import { setTicketStatus } from "@/features/support/actions";
import { useI18n } from "@/i18n/client";

type Ticket = { id: string; subject: string; message: string; status: string; created_at: string; profiles?: { email: string; full_name: string | null } | null };

export function TicketRow({ ticket: tk }: { ticket: Ticket }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const email = tk.profiles?.email ?? "";
  return (
    <div className="border-b border-neutral-200 last:border-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronDown className={cn("size-4 shrink-0 text-neutral-400 transition-transform", !open && "-rotate-90")} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{tk.subject}</span>
            <span className="block truncate text-xs text-neutral-500">{tk.profiles?.full_name ?? email} · {email} · {formatDateCompact(tk.created_at, undefined, lang)} {formatTime(tk.created_at, undefined, undefined, lang)}</span>
          </span>
        </button>
        {email && <ButtonLink size="sm" variant="outline" icon={<Mail />} href={`mailto:${email}?subject=${encodeURIComponent(`Re: ${tk.subject}`)}`}>{t("Balas")}</ButtonLink>}
        {tk.status === "open"
          ? <ActionButton size="sm" variant="secondary" icon={<CircleCheck />} action={() => setTicketStatus(tk.id, "closed")}>{t("Selesai")}</ActionButton>
          : <ActionButton size="sm" variant="ghost" icon={<RotateCcw />} action={() => setTicketStatus(tk.id, "open")}>{t("Buka lagi")}</ActionButton>}
      </div>
      {open && <p className="bg-neutral-50 px-5 py-3 pl-11 text-[13.5px] leading-6 whitespace-pre-line text-neutral-700">{tk.message}</p>}
    </div>
  );
}
