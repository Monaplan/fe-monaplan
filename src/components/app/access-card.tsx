import Link from "next/link";
import { Hourglass, Infinity as InfinityIcon, Lock, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { formatDateCompact } from "@/lib/format";
import type { AccessState } from "@/lib/access";
import { getI18n } from "@/i18n/server";

// Kartu Status Akses di sidebar (DESIGN.md 6.3)
export async function AccessStatusCard({ access, isOwner, base, canInvite, compact }: {
  access: AccessState;
  isOwner: boolean;
  base: string;
  canInvite: boolean;
  compact?: boolean;
}) {
  const { t, lang } = await getI18n();
  const days = access.endsAt ? Math.max(0, Math.ceil((Date.parse(access.endsAt) - Date.now()) / 86_400_000)) : null;
  const total = access.endsAt && access.startsAt ? Math.max(1, (Date.parse(access.endsAt) - Date.parse(access.startsAt)) / 86_400_000) : 365;
  const trial = !!access.isTrial;
  const soon = access.state === "timed" && days !== null && days <= (trial ? 1 : 14);

  let icon = <Sparkles />, title = t("Aktifkan Akses"), body: React.ReactNode = t("Pilih paket atau masukkan kode akses.");
  let primary: { href: string; label: string } | null = { href: "/aktivasi", label: t("Aktifkan") };

  if (access.state === "lifetime") {
    icon = <InfinityIcon />; title = t("Akses Selamanya"); body = t("Ajak pasangan atau keluarga ikut merencanakan.");
    primary = canInvite ? { href: `${base}/pengaturan?tab=kolaborator`, label: t("Undang Kolaborator") } : null;
  } else if (access.state === "timed") {
    icon = <Hourglass />;
    title = trial ? (soon ? t("Trial segera berakhir") : t("Masa trial")) : soon ? t("Akses segera berakhir") : t("Akses aktif");
    body = soon ? t("Berakhir {date}", { date: formatDateCompact(access.endsAt, undefined, lang) }) : t("{left} hari lagi", { left: days });
    primary = { href: "/aktivasi", label: trial ? t("Dapatkan Akses Selamanya") : t("Upgrade ke Selamanya") };
  } else if (access.state === "expired" || access.state === "revoked") {
    icon = <Lock />;
    title = trial && access.state === "expired" ? t("Trial berakhir") : t("Akses berakhir");
    body = t("Data tetap aman, aktifkan lagi untuk mengedit.");
    primary = access.state === "revoked" ? { href: "/akun/bantuan", label: t("Hubungi Bantuan") } : { href: "/aktivasi", label: t("Dapatkan Akses Selamanya") };
  }

  const isCollab = !isOwner && access.state !== "lifetime";

  if (compact) {
    return (
      <Link href={isCollab ? "#" : (primary?.href ?? "/akun")} title={title} className="access-gradient mx-auto flex size-11 items-center justify-center rounded-full text-white [&_svg]:size-5">
        {icon}
      </Link>
    );
  }

  return (
    <div className="access-gradient rounded-xl p-3.5 text-white shadow-btn">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 [&_svg]:size-4">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] leading-4 font-semibold">{title}</span>
          <span className="block truncate text-[11.5px] leading-4 text-white/70">{body}</span>
        </span>
      </div>
      {access.state === "timed" && days !== null && (
        <ProgressBar value={days / total} tone={soon ? "caution" : "white"} className="mt-3 h-1.5" />
      )}
      {isCollab ? (
        <p className="mt-2.5 text-[11.5px] text-white/70">{t("Hubungi pemilik ruang kerja.")}</p>
      ) : primary && (
        <Link href={primary.href} className={buttonClass("white", "sm", "mt-3 h-8 w-full text-[12.5px]")}>{primary.label}</Link>
      )}
    </div>
  );
}
