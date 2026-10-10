import { Hourglass, Infinity as InfinityIcon, KeyRound, Lock, Sparkles } from "lucide-react";
import { daysLeft, getMyAccess, getMyLicenses, requireUser } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getOwnedLifetime } from "@/lib/upgrade";
import { Card, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/pill";
import { formatDateCompact } from "@/lib/format";
import { ProfileForm, DeleteAccountForm } from "./profile-form";
import { ThemeSwitcher } from "@/components/app/theme";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { LiveCountdown } from "@/components/app/live-countdown";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Akun") };
}

const SOURCE: Record<string, string> = { payment: "Dibayar", access_code: "Kode akses", admin_grant: "Diberikan admin", trial: "Trial" };

export default async function AccountPage() {
  const { t, lang } = await getI18n();
  const { profile, user } = await requireUser();
  const [access, licenses, owned, { data: plans }] = await Promise.all([
    getMyAccess(),
    getMyLicenses(),
    getOwnedLifetime(createAdminClient(), user.id),
    createClient().then((s) => s.from("plans").select("id, tier").eq("type", "lifetime")),
  ]);
  const canUpgrade = !!owned && (plans ?? []).some((p) => Number(p.tier ?? 1) > owned.tier);
  const current = licenses.find((l) => l.status === "active" && (!l.ends_at || Date.parse(l.ends_at) > Date.now()));
  const left = daysLeft(access.endsAt);

  return (
    <div className="flex flex-col gap-4">
      <ProductTour id="akun" steps={TOURS.akun!} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card tour="akun-profil">
          <CardHeader title={t("Profil")} />
          <div className="mb-4 flex items-center gap-3">
            {profile?.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" className="size-12 rounded-full" />
            )}
            <div><p className="font-semibold">{profile?.full_name ?? "-"}</p><p className="text-[13px] text-neutral-500">{profile?.email ?? user.email}</p></div>
          </div>
          <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} notifyEmail={profile?.notify_email ?? true} />
        </Card>

        <Card tour="akun-lisensi">
          <CardHeader icon={access.state === "lifetime" ? <InfinityIcon /> : access.state === "timed" ? <Hourglass /> : access.state === "none" ? <Sparkles /> : <Lock />} title={t("Lisensi")} />
          {access.state === "lifetime" && <><p className="text-2xl font-bold">{t("Selamanya")}</p><p className="mt-1 text-[13px] text-neutral-600">{owned?.planName ?? current?.plans?.name}</p></>}
          {access.state === "timed" && (
            <>
              <p className="tabular text-2xl font-bold">{access.isTrial && access.endsAt ? <><LiveCountdown endsAt={access.endsAt} /> <span className="text-base font-medium text-neutral-500">{t("lagi")}</span></> : t("{left} hari lagi", { left })}</p>
              <p className="mt-1 text-[13px] text-neutral-600">{access.isTrial ? t("Masa trial") : current?.plans?.name} · {t("aktif sampai {date}", { date: formatDateCompact(access.endsAt, undefined, lang) })}</p>
            </>
          )}
          {(access.state === "expired" || access.state === "revoked") && (
            <><p className="text-2xl font-bold">{access.state === "expired" ? (access.isTrial ? t("Trial berakhir") : t("Berakhir")) : t("Tidak aktif")}</p><p className="mt-1 text-[13px] text-neutral-600">{access.endsAt && `${t("Berakhir {date}.", { date: formatDateCompact(access.endsAt, undefined, lang) })} `}{t("Data tetap aman dan bisa diekspor.")}</p></>
          )}
          {access.state === "none" && <p className="text-[13px] text-neutral-600">{t("Belum ada lisensi aktif.")}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {access.state === "timed" && <ButtonLink href="/aktivasi">{access.isTrial ? t("Dapatkan Akses Selamanya") : t("Upgrade ke Selamanya")}</ButtonLink>}
            {(access.state === "expired" || access.state === "none") && <ButtonLink href="/aktivasi" icon={<KeyRound />}>{t("Aktifkan")}</ButtonLink>}
            {access.state === "lifetime" && canUpgrade && <ButtonLink href="/aktivasi">{t("Upgrade paket")}</ButtonLink>}
            {access.state === "revoked" && <ButtonLink href="/akun/bantuan" variant="secondary">{t("Hubungi Bantuan")}</ButtonLink>}
          </div>
        </Card>
      </div>

      <Card tour="akun-tampilan">
        <CardHeader title={t("Tampilan dan bahasa")} subtitle={t("Tema terang, gelap, atau ikuti perangkat.")} />
        <ThemeSwitcher className="max-w-sm" />
        <p className="mt-4 mb-2 text-[13px] font-medium text-neutral-800">{t("Bahasa")}</p>
        <LanguageSwitcher className="max-w-sm" />
      </Card>

      <Card>
        <CardHeader title={t("Riwayat Aktivasi")} />
        {licenses.length === 0 ? <p className="text-[13px] text-neutral-500">{t("Belum ada riwayat.")}</p> : (
          <ul className="divide-y divide-neutral-200">
            {licenses.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{l.plans?.name ?? t("Paket")}</p>
                  <p className="text-xs text-neutral-500">{t(SOURCE[l.source]!)} · {t("{start} sampai {end}", { start: formatDateCompact(l.starts_at, undefined, lang), end: l.ends_at ? formatDateCompact(l.ends_at, undefined, lang) : t("selamanya") })}</p>
                </div>
                {l.status === "revoked" ? <StatusPill tone="danger">{t("Dicabut")}</StatusPill>
                  : l.ends_at && Date.parse(l.ends_at) < Date.now() ? <StatusPill>{t("Berakhir")}</StatusPill>
                  : Date.parse(l.starts_at) > Date.now() ? <StatusPill tone="caution">{t("Antre")}</StatusPill>
                  : <StatusPill tone="positive">{t("Aktif")}</StatusPill>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-danger">
        <CardHeader title={t("Hapus Akun")} subtitle={t("Menghapus akun dan semua proyek milikmu secara permanen.")} />
        <DeleteAccountForm email={profile?.email ?? user.email ?? ""} />
      </Card>
    </div>
  );
}
