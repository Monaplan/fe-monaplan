import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID_RE } from "@/lib/paths";

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
  language?: "id" | "en" | null;
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
  plans?: { name: string; type: "lifetime" | "timed"; tier?: number; max_collaborators: number; max_projects: number; storage_quota_mb: number } | null;
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
    .select("*, plans(*)")
    .order("created_at", { ascending: false });
  return (data ?? []) as License[];
});

export const getMyAccess = cache(async () => computeLicenseState(await getMyLicenses()));

export const getMyProjects = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_members")
    .select("role, wedding_projects(*)")
    .order("joined_at", { ascending: true });
  return (data ?? [])
    .map((m: any) => ({ role: m.role as string, ...(m.wedding_projects as any) }))
    .filter((p) => p.id) as { id: string; slug?: string | null; title: string; role: string; archived_at: string | null; owner_id: string }[];
});

export type Project = {
  id: string;
  created_at?: string;
  slug?: string | null;
  storage_prefix?: string | null;
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
  rsvp_template?: string;
  cover_image_path: string | null;
  onboarding_completed_at: string | null;
  archived_at: string | null;
};

export type Member = {
  user_id: string;
  role: "owner" | "editor" | "viewer";
  profiles: { full_name: string | null; email: string; avatar_url: string | null } | null;
};

// Pemetaan slug ke ID disimpan di memori proses. Keanggotaan tetap diperiksa lewat RLS pada setiap permintaan, dan
// pemetaan yang usang (slug dipakai ulang setelah proyek dihapus) dibuang otomatis saat konteksnya tidak ditemukan.
const SLUG_CACHE = new Map<string, string>();
const SLUG_CACHE_MAX = 1000;
// Zona waktu proyek, diisi setelah konteks termuat. Dipakai layout untuk memulai query lencana tanpa menunggu konteks.
const TZ_CACHE = new Map<string, string>();

// Tebakan dari memori proses saja (tanpa ke database): ID dan zona waktu proyek bila sudah pernah dimuat.
export function peekProject(ref: string): { projectId: string; timezone: string } | null {
  const projectId = UUID_RE.test(ref) ? ref : SLUG_CACHE.get(ref);
  const timezone = projectId ? TZ_CACHE.get(projectId) : undefined;
  return projectId && timezone ? { projectId, timezone } : null;
}

async function resolveProjectId(ref: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  if (UUID_RE.test(ref)) return ref;
  const hit = SLUG_CACHE.get(ref);
  if (hit) return hit;
  const { data } = await supabase.from("wedding_projects").select("id").eq("slug", ref).maybeSingle();
  if (data?.id) return data.id as string;
  // Slug lama (sudah diganti pemiliknya): cari di riwayat, lalu halaman mengalihkan ke slug terbaru
  const { data: old } = await createAdminClient().from("project_slug_history").select("project_id").eq("slug", ref).maybeSingle();
  return (old?.project_id as string | undefined) ?? null;
}

// ref boleh berupa slug atau UUID (alamat lama dan pemanggilan dari server action).
// Muatan konteks di-cache per ID, sehingga pemanggilan dengan slug dan dengan UUID dalam satu permintaan memakai hasil yang sama.
export async function getProjectContext(ref: string) {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  let projectId = await resolveProjectId(ref, supabase);
  if (!projectId) notFound();
  let ctx;
  try {
    ctx = await loadProjectContext(projectId);
  } catch (e) {
    // Slug dari memori bisa usang (proyek dihapus lalu slug yang sama dipakai proyek lain): buang dan cari ulang di database sekali
    const gone = typeof (e as { digest?: unknown })?.digest === "string" && String((e as { digest: string }).digest).includes("404");
    if (!gone || UUID_RE.test(ref) || !SLUG_CACHE.has(ref)) throw e;
    SLUG_CACHE.delete(ref);
    TZ_CACHE.delete(projectId);
    projectId = await resolveProjectId(ref, supabase);
    if (!projectId) notFound();
    ctx = await loadProjectContext(projectId);
  }
  if (TZ_CACHE.size >= SLUG_CACHE_MAX) TZ_CACHE.clear();
  TZ_CACHE.set(projectId, ctx.project.timezone);
  if (ctx.project.slug && !UUID_RE.test(ref)) {
    if (SLUG_CACHE.size >= SLUG_CACHE_MAX) SLUG_CACHE.clear();
    SLUG_CACHE.set(ctx.project.slug, projectId);
  }
  return ctx;
}

const loadProjectContext = cache(async (projectId: string) => {
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

  return { session, supabase, projectId, project: p, role, members: memberList, access, canWrite, isOwner: role === "owner" };
});

export async function requireAdmin() {
  const session = await requireUser();
  if (session.profile?.role !== "admin") notFound();
  return session;
}

// Mulai mengambil data halaman bersamaan dengan konteks proyek. Bila proyek sudah dikenal di memori (peekProject),
// satu putaran ke database terhemat; bila belum, data diambil setelah konteks seperti biasa. RLS tetap membatasi
// data, dan konteks yang gagal (bukan anggota, tidak ada) tetap mengalihkan atau 404.
export async function withProjectData<T>(ref: string, load: (projectId: string, supabase: Awaited<ReturnType<typeof createClient>>, timezone: string) => Promise<T>) {
  const hint = peekProject(ref);
  const ctxPromise = getProjectContext(ref);
  const early = hint ? createClient().then((s) => load(hint.projectId, s, hint.timezone)) : null;
  // Bila konteks gagal lebih dulu, hasil data yang menggantung tidak boleh menjadi galat tak tertangani
  early?.catch(() => {});
  const ctx = await ctxPromise;
  // Tebakan dari memori ternyata usang (slug dipakai ulang proyek lain): ambil ulang untuk proyek yang benar
  if (early && hint!.projectId === ctx.projectId) return [ctx, await early] as const;
  return [ctx, await load(ctx.projectId, ctx.supabase, ctx.project.timezone)] as const;
}
