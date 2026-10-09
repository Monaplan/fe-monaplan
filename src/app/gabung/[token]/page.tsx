import { Logo } from "@/components/app/logo";
import { requireUser } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABEL } from "@/lib/constants";
import { JoinButton } from "./join-button";
import { NOINDEX } from "@/lib/seo";
import { getI18n } from "@/i18n/server";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Gabung Ruang Kerja"), robots: NOINDEX };
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { t } = await getI18n();
  const { token } = await params;
  const { user } = await requireUser();
  const { data: inv } = await createAdminClient()
    .from("project_invitations")
    .select("email, role, status, expires_at, wedding_projects(title), profiles:invited_by(full_name)")
    .eq("token", token)
    .maybeSingle();

  const valid = inv && inv.status === "pending" && Date.parse(inv.expires_at) > Date.now();
  const mismatch = valid && inv.email.toLowerCase() !== (user.email ?? "").toLowerCase();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-plum-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-surface p-8 text-center">
        <Logo className="mb-6" />
        {!valid ? (
          <>
            <h1 className="text-xl font-semibold">{t("Undangan tidak berlaku")}</h1>
            <p className="mt-2 text-[13px] text-neutral-600">{t("Undangan sudah dipakai, dibatalkan, atau kedaluwarsa. Minta pemilik ruang kerja mengundang ulang.")}</p>
          </>
        ) : (
          <>
            <p className="text-[13px] text-neutral-600">{(inv as any).profiles?.full_name ?? t("Pemilik ruang kerja")}{" "}{t("mengundangmu ke")}</p>
            <h1 className="mt-1 font-display text-[32px] leading-10 font-medium">{(inv as any).wedding_projects?.title}</h1>
            <p className="mt-2 text-[13px] text-neutral-600">sebagai <b>{t(ROLE_LABEL[inv.role])}</b></p>
            {mismatch ? (
              <div className="mt-5 rounded-md bg-danger-bg p-3 text-left text-[13px] text-danger">{t("Undangan ini untuk")}{" "}<b>{inv.email}</b>{t(", sedangkan kamu masuk sebagai")}{" "}<b>{user.email}</b>. Keluar lalu masuk dengan email yang diundang, atau minta pemilik mengundang ulang.
                <form action="/auth/signout" method="post" className="mt-3"><button className="font-semibold underline">{t("Keluar dan ganti akun")}</button></form>
              </div>
            ) : (
              <JoinButton token={token} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
