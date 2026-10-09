import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LicenseStateKey = "lifetime" | "timed" | "expired" | "revoked" | "none";
export type AccessState = { state: LicenseStateKey; endsAt: string | null; startsAt: string | null; isTrial?: boolean };

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: "user" | "admin";
  last_active_project_id: string | null;
  notify_email: boolean;
};

export type License = {
  id: string;
  user_id: string;
  plan_id: string;
  source: "payment" | "access_code" | "admin_grant" | "trial";
  status: "active" | "revoked";
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  revoked_reason: string | null;
  plans?: { name: string; type: "lifetime" | "timed"; max_collaborators: number; max_projects: number; storage_quota_mb: number } | null;
};

export function computeLicenseState(licenses: (Pick<License, "status" | "starts_at" | "ends_at"> & { source?: License["source"] })[]): AccessState {
  const now = Date.now();
  const active = licenses.filter((l) => l.status === "active");
  const current = active.filter((l) => Date.parse(l.starts_at) <= now && (!l.ends_at || Date.parse(l.ends_at) > now));
  if (active.some((l) => !l.ends_at && Date.parse(l.starts_at) <= now)) {
    return { state: "lifetime", endsAt: null, startsAt: null };
  }
  const lastEnd = active.reduce<string | null>((acc, l) => (l.ends_at && (!acc || l.ends_at > acc) ? l.ends_at : acc), null);
  // Masa uji coba: semua lisensi aktif berasal dari trial (tidak ada yang dibeli atau diberikan)
  const isTrial = active.length > 0 && active.every((l) => l.source === "trial");
  if (current.length) {
    const startsAt = current.reduce((acc, l) => (l.starts_at < acc ? l.starts_at : acc), current[0]!.starts_at);
    return { state: "timed", endsAt: lastEnd, startsAt, isTrial };
  }
  if (active.length) return { state: "expired", endsAt: lastEnd, startsAt: null, isTrial };
  if (licenses.length) return { state: "revoked", endsAt: null, startsAt: null };
  return { state: "none", endsAt: null, startsAt: null };
}

export function isActive(s: AccessState) {
  return s.state === "lifetime" || s.state === "timed";
}

export function daysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((Date.parse(endsAt) - Date.now()) / 86_400_000));
}

export type AuthUser = { id: string; email: string | undefined };

// Identitas dari klaim JWT: tanpa panggilan jaringan ke Supabase Auth bila proyek memakai kunci penandatangan asimetris
// (getClaims memverifikasi tanda tangan secara lokal; bila tidak, ia otomatis jatuh ke getUser).
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  return c?.sub ? { id: c.sub, email: typeof c.email === "string" ? c.email : undefined } : null;
});

export const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data as Profile | null;
});

export const getSession = cache(async () => {
  const user = await getAuthUser();
  if (!user) return null;
  return { user, profile: await getProfile(user.id) };
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export const getMyLicenses = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("licenses")
    .select("*, plans(name, type, max_collaborators, max_projects, storage_quota_mb)")
    .order("created_at", { ascending: false });
  return (data ?? []) as License[];
});

export const getMyAccess = cache(async () => computeLicenseState(await getMyLicenses()));

export const getMyProjects = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_members")
    .select("role, wedding_projects(id, title, archived_at, owner_id, onboarding_completed_at)")
    .order("joined_at", { ascending: true });
  return (data ?? [])
    .map((m: any) => ({ role: m.role as string, ...(m.wedding_projects as any) }))
    .filter((p) => p.id) as { id: string; title: string; role: string; archived_at: string | null; owner_id: string }[];
});

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  partner_one_name: string;
  partner_one_nickname: string | null;
  partner_two_name: string;
  partner_two_nickname: string | null;
  wedding_date: string | null;
  city: string | null;
  timezone: string;
  total_budget_idr: number;
  guest_target: number | null;
  rsvp_deadline: string | null;
  cover_image_path: string | null;
  onboarding_completed_at: string | null;
  archived_at: string | null;
};

export type Member = {
  user_id: string;
  role: "owner" | "editor" | "viewer";
  profiles: { full_name: string | null; email: string; avatar_url: string | null } | null;
};

export const getProjectContext = cache(async (projectId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) notFound();
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  // Profil, proyek, anggota, dan status akses diambil serentak: satu putaran ke database, bukan empat berurutan
  const [profile, { data: project }, { data: members }, { data: accessRaw }] = await Promise.all([
    getProfile(user.id),
    supabase.from("wedding_projects").select("*").eq("id", projectId).maybeSingle(),
    supabase.from("project_members").select("user_id, role, profiles!project_members_user_id_fkey(full_name, email, avatar_url)").eq("project_id", projectId),
    supabase.rpc("project_access_state", { p_project_id: projectId }),
  ]);
  if (!project) notFound();

  const memberList = (members ?? []) as unknown as Member[];
  const session = { user, profile };
  const role = memberList.find((m) => m.user_id === user.id)?.role;
  if (!role) notFound();

  const a = (accessRaw ?? { state: "none" }) as { state: LicenseStateKey; ends_at?: string | null; starts_at?: string | null; is_trial?: boolean };
  const access: AccessState = { state: a.state, endsAt: a.ends_at ?? null, startsAt: a.starts_at ?? null, isTrial: !!a.is_trial };
  const p = project as Project;
  const canWrite = (role === "owner" || role === "editor") && isActive(access) && !p.archived_at;

  return { session, supabase, project: p, role, members: memberList, access, canWrite, isOwner: role === "owner" };
});

export async function requireAdmin() {
  const session = await requireUser();
  if (session.profile?.role !== "admin") notFound();
  return session;
}
