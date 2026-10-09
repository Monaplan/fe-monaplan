import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { StatusPill } from "@/components/ui/pill";
import { computeLicenseState } from "@/lib/access";
import { formatDateCompact } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { DeleteUserButton } from "./delete-user";
import { ManageUserButton } from "./manage-user";

export const metadata = { title: "Pengguna" };

const LABEL: Record<string, string> = { lifetime: "Selamanya", timed: "Bermasa aktif", expired: "Berakhir", revoked: "Dicabut", none: "Belum aktif" };
const trialLabel = (state: string) => (state === "timed" ? "Trial" : LABEL[state]!);

// ADM-06: lihat lisensi dan daftar proyek tanpa membuka isi data proyek
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { user: me } = await requireAdmin();
  const { q } = await searchParams;
  const admin = createAdminClient();
  let query = admin.from("profiles").select("id, email, full_name, role, created_at, licenses!licenses_user_id_fkey(status, starts_at, ends_at, source), wedding_projects!wedding_projects_owner_id_fkey(id, title, archived_at, created_at)")
    .order("created_at", { ascending: false }).limit(50);
  if (q) query = query.ilike("email", `%${q.replace(/[%_]/g, "")}%`);
  const [{ data: users }, settings] = await Promise.all([query, getSettings()]);

  return (
    <>
      <PageHeader title="Pengguna" description="Atur peran dan akses pengguna, lihat proyeknya tanpa membuka isi datanya, dan hapus akun bila diminta pengguna atau karena penyalahgunaan." />
      <form className="mb-4"><Input name="q" defaultValue={q} placeholder="Cari email" className="max-w-xs" /></form>
      <Card className="p-0 sm:p-0">
        {(users ?? []).map((u: any) => {
          const s = computeLicenseState(u.licenses ?? []);
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-neutral-200 px-5 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.email}{u.role === "admin" && <span className="ml-2 text-xs text-plum-600">admin</span>}</p>
                <p className="truncate text-xs text-neutral-500">
                  {u.full_name ?? "-"} · daftar {formatDateCompact(u.created_at)} · proyek: {(u.wedding_projects ?? []).map((p: any) => `${p.title}${p.archived_at ? " (arsip)" : ""}`).join(", ") || "-"}
                </p>
              </div>
              <StatusPill tone={s.state === "lifetime" || s.state === "timed" ? "positive" : s.state === "revoked" ? "danger" : "neutral"}>
                {s.isTrial ? trialLabel(s.state) : LABEL[s.state]}{s.state === "timed" && s.endsAt ? ` s/d ${formatDateCompact(s.endsAt)}` : ""}
              </StatusPill>
              <ManageUserButton
                user={{ id: u.id, email: u.email, full_name: u.full_name, role: u.role }}
                access={{ state: s.state, isTrial: !!s.isTrial, label: LABEL[s.state]! + (s.state === "timed" && s.endsAt ? ` s/d ${formatDateCompact(s.endsAt)}` : "") }}
                isSelf={u.id === me.id}
                defaultTrialDays={settings.trial.days}
              />
              <DeleteUserButton
                user={{ id: u.id, email: u.email, full_name: u.full_name }}
                projects={(u.wedding_projects ?? []).map((p: any) => p.title)}
                isSelf={u.id === me.id}
              />
            </div>
          );
        })}
        {!users?.length && <p className="px-5 py-8 text-center text-[13px] text-neutral-500">Tidak ada pengguna.</p>}
      </Card>
    </>
  );
}
