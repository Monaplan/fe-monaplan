import { Hourglass, Infinity as InfinityIcon, KeyRound, Lock, Sparkles } from "lucide-react";
import { daysLeft, getMyAccess, getMyLicenses, requireUser } from "@/lib/access";
import { Card, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/pill";
import { formatDateCompact } from "@/lib/format";
import { ProfileForm, DeleteAccountForm } from "./profile-form";
import { ThemeSwitcher } from "@/components/app/theme";

export const metadata = { title: "Akun" };

const SOURCE: Record<string, string> = { payment: "Pembayaran", access_code: "Kode akses", admin_grant: "Diberikan admin", trial: "Trial" };

export default async function AccountPage() {
  const { profile, user } = await requireUser();
  const [access, licenses] = await Promise.all([getMyAccess(), getMyLicenses()]);
  const current = licenses.find((l) => l.status === "active" && (!l.ends_at || Date.parse(l.ends_at) > Date.now()));
  const left = daysLeft(access.endsAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Profil" />
          <div className="mb-4 flex items-center gap-3">
            {profile?.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" className="size-12 rounded-full" />
            )}
            <div><p className="font-semibold">{profile?.full_name ?? "-"}</p><p className="text-[13px] text-neutral-500">{profile?.email ?? user.email}</p></div>
          </div>
          <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} notifyEmail={profile?.notify_email ?? true} />
        </Card>

        <Card>
          <CardHeader icon={access.state === "lifetime" ? <InfinityIcon /> : access.state === "timed" ? <Hourglass /> : access.state === "none" ? <Sparkles /> : <Lock />} title="Lisensi" />
          {access.state === "lifetime" && <><p className="text-2xl font-bold">Selamanya</p><p className="mt-1 text-[13px] text-neutral-600">{current?.plans?.name}</p></>}
          {access.state === "timed" && (
            <>
              <p className="tabular text-2xl font-bold">{left} hari lagi</p>
              <p className="mt-1 text-[13px] text-neutral-600">{access.isTrial ? "Masa trial" : current?.plans?.name} · aktif sampai {formatDateCompact(access.endsAt)}</p>
            </>
          )}
          {(access.state === "expired" || access.state === "revoked") && (
            <><p className="text-2xl font-bold">{access.state === "expired" ? (access.isTrial ? "Trial berakhir" : "Berakhir") : "Tidak aktif"}</p><p className="mt-1 text-[13px] text-neutral-600">{access.endsAt && `Berakhir ${formatDateCompact(access.endsAt)}. `}Data tetap aman dan bisa diekspor.</p></>
          )}
          {access.state === "none" && <p className="text-[13px] text-neutral-600">Belum ada lisensi aktif.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {access.state === "timed" && <ButtonLink href="/aktivasi">{access.isTrial ? "Dapatkan Akses Selamanya" : "Upgrade ke Selamanya"}</ButtonLink>}
            {(access.state === "expired" || access.state === "none") && <ButtonLink href="/aktivasi" icon={<KeyRound />}>Aktifkan</ButtonLink>}
            {access.state === "revoked" && <ButtonLink href="mailto:halo@monaplan.id" variant="secondary">Hubungi Bantuan</ButtonLink>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Tampilan" subtitle="Pilih tema terang, gelap, atau ikuti pengaturan perangkat." />
        <ThemeSwitcher className="max-w-sm" />
      </Card>

      <Card>
        <CardHeader title="Riwayat Aktivasi" />
        {licenses.length === 0 ? <p className="text-[13px] text-neutral-500">Belum ada riwayat.</p> : (
          <ul className="divide-y divide-neutral-200">
            {licenses.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{l.plans?.name ?? "Paket"}</p>
                  <p className="text-xs text-neutral-500">{SOURCE[l.source]} · {formatDateCompact(l.starts_at)} sampai {l.ends_at ? formatDateCompact(l.ends_at) : "selamanya"}</p>
                </div>
                {l.status === "revoked" ? <StatusPill tone="danger">Dicabut</StatusPill>
                  : l.ends_at && Date.parse(l.ends_at) < Date.now() ? <StatusPill>Berakhir</StatusPill>
                  : Date.parse(l.starts_at) > Date.now() ? <StatusPill tone="caution">Antre</StatusPill>
                  : <StatusPill tone="positive">Aktif</StatusPill>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-danger">
        <CardHeader title="Hapus Akun" subtitle="Menghapus akun, data pribadi, dan semua proyek yang kamu miliki secara permanen." />
        <DeleteAccountForm email={profile?.email ?? user.email ?? ""} />
      </Card>
    </div>
  );
}
