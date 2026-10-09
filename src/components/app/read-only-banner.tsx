import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { formatDateCompact } from "@/lib/format";
import type { AccessState } from "@/lib/access";
import { getI18n } from "@/i18n/server";

export async function ReadOnlyBanner({ access, isOwner, role, archived }: { access: AccessState; isOwner: boolean; role: string; archived: boolean }) {
  const { t, lang } = await getI18n();
  let text: string | null = null;
  let actions: React.ReactNode = null;

  if (archived) {
    text = "Proyek ini diarsipkan. Data hanya bisa dilihat dan diekspor.";
  } else if (access.state === "revoked") {
    text = "Akses ruang kerja ini sedang tidak aktif. Data tetap aman dan bisa diekspor. Hubungi kami bila menurutmu ini keliru.";
    if (isOwner) actions = <a href="/akun/bantuan" className={buttonClass("primary", "sm")}>{t("Hubungi Bantuan")}</a>;
  } else if (access.state === "expired" || access.state === "none") {
    if (isOwner) {
      text = access.isTrial
        ? `Masa trial kalian berakhir${access.endsAt ? ` pada ${formatDateCompact(access.endsAt, undefined, lang)}` : ""}. Data tetap aman dan bisa diekspor. Dapatkan akses selamanya untuk kembali mengedit.`
        : `Akses kalian berakhir${access.endsAt ? ` pada ${formatDateCompact(access.endsAt, undefined, lang)}` : ""}. Data tetap aman dan bisa diekspor. Aktifkan lagi untuk kembali mengedit.`;
      actions = <Link href="/aktivasi" className={buttonClass("primary", "sm")}>{t("Dapatkan Akses Selamanya")}</Link>;
    } else {
      text = "Akses ruang kerja ini sudah berakhir. Minta pemilik ruang kerja untuk memperpanjang.";
    }
  } else if (role === "viewer") {
    text = "Kamu bergabung sebagai Viewer, jadi hanya bisa melihat data.";
  }
  if (!text) return null;

  return (
    <div className="no-print mb-4 flex flex-col gap-3 rounded-lg bg-plum-100 px-4 py-3 text-plum-800 sm:flex-row sm:items-center">
      <Lock className="size-5 shrink-0" />
      <p className="flex-1 text-[13px] leading-5">{text}</p>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
