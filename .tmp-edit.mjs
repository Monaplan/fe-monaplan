import fs from "node:fs";
function edit(p, pairs) {
  let s = fs.readFileSync(p, "utf8");
  for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(p + " tidak ketemu: " + a.slice(0, 70)); s = s.replace(a, b); }
  fs.writeFileSync(p, s);
}

edit("src/lib/access.ts", [
  [`import { createClient } from "@/lib/supabase/server";`, `import { createClient } from "@/lib/supabase/server";\nimport { createAdminClient } from "@/lib/supabase/admin";\nimport { UUID_RE } from "@/lib/paths";`],
  [`    .select("role, wedding_projects(id, title, archived_at, owner_id, onboarding_completed_at)")`, `    .select("role, wedding_projects(*)")`],
  [`  .filter((p) => p.id) as { id: string; title: string; role: string; archived_at: string | null; owner_id: string }[];`, `  .filter((p) => p.id) as { id: string; slug?: string | null; title: string; role: string; archived_at: string | null; owner_id: string }[];`],
  [`export type Project = {
  id: string;`, `export type Project = {
  id: string;
  slug?: string | null;
  storage_prefix?: string | null;`],
  [`export const getProjectContext = cache(async (projectId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) notFound();
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
`, `// Pemetaan slug ke ID disimpan di memori proses. Aman karena slug tidak pernah dipakai ulang untuk proyek lain
// (riwayat slug mencegahnya), dan keanggotaan tetap diperiksa lewat RLS pada setiap permintaan.
const SLUG_CACHE = new Map<string, string>();
const SLUG_CACHE_MAX = 1000;

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

// ref boleh berupa slug atau UUID (alamat lama dan pemanggilan dari server action)
export const getProjectContext = cache(async (ref: string) => {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const projectId = await resolveProjectId(ref, supabase);
  if (!projectId) notFound();
`],
  [`  const role = memberList.find((m) => m.user_id === user.id)?.role;
  if (!role) notFound();
`, `  const role = memberList.find((m) => m.user_id === user.id)?.role;
  if (!role) notFound();
  if ((project as Project).slug && !UUID_RE.test(ref)) {
    if (SLUG_CACHE.size >= SLUG_CACHE_MAX) SLUG_CACHE.clear();
    SLUG_CACHE.set((project as Project).slug!, projectId);
  }
`],
  [`  return { session, supabase, project: p, role, members: memberList, access, canWrite, isOwner: role === "owner" };`, `  return { session, supabase, projectId, project: p, role, members: memberList, access, canWrite, isOwner: role === "owner" };`],
]);

// ---- Halaman ruang kerja: param adalah rujukan (slug/UUID), projectId diambil dari konteks ----
const root = "src/app/app/[projectId]";
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = d + "/" + f.name; f.isDirectory() ? walk(p) : /page\.tsx$/.test(f.name) && files.push(p); } })(root);
for (const p of files) {
  let s = fs.readFileSync(p, "utf8");
  s = s.replace(/const \{ projectId(, vendorId)? \} = await params;/, (_, v) => `const { projectId: ref${v ?? ""} } = await params;`);
  s = s.replace(/const \{ ([^}]*) \} = await getProjectContext\(projectId\);/, (_, list) => `const { ${list.includes("projectId") ? list : list + ", projectId"} } = await getProjectContext(ref);`);
  s = s.split("`/w/${projectId}").join("`/app/${ref}");
  fs.writeFileSync(p, s);
  console.log("page:", p);
}
