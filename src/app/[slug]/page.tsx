import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { clientIp } from "@/lib/codes";
import { rateLimited } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/format";
import { SLUG_RE } from "@/lib/paths";
import { RsvpView, partnerOf } from "@/components/rsvp/rsvp-view";
import { RsvpForm } from "./rsvp-form";
import { getDownloadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Undangan Pernikahan", robots: { index: false, follow: false } };

// Nama dari ?to= hanya untuk ditampilkan: karakter kontrol dibuang, spasi dirapikan, panjang dibatasi
const cleanName = (v: string | string[] | undefined) => {
  const raw = Array.isArray(v) ? v[0] : v;
  return (raw ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
};

type Lookup = { matches: number; guest?: { id: string; name: string; pax_invited: number; rsvp_status: string; pax_confirmed: number } };

// Undangan publik: domain/slug-pengantin?to=Nama Tamu
export default async function InvitePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ to?: string | string[] }> }) {
  const { slug: rawSlug } = await params;
  const to = cleanName((await searchParams).to);
  // Tautan yang tertulis dengan huruf besar (mis. dibagikan lewat aplikasi yang mengubah huruf) diarahkan ke bentuk kecil
  const slug = rawSlug.toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length > 60) notFound();
  if (slug !== rawSlug) redirect(`/${slug}${to ? `?to=${encodeURIComponent(to)}` : ""}`);
  // Halaman ini menyentuh database untuk setiap alamat satu segmen, jadi pemindaian alamat acak dibatasi per IP
  if (rateLimited(`invite:${clientIp(await headers()) ?? "unknown"}`, 90)) notFound();
  const admin = createAdminClient();

  const { data: project } = await admin.from("wedding_projects").select("*").eq("slug", slug).maybeSingle();
  if (!project) {
    // Alamat lama diarahkan ke alamat baru
    const { data: old } = await admin.from("project_slug_history").select("project_id").eq("slug", slug).maybeSingle();
    const { data: current } = old ? await admin.from("wedding_projects").select("slug").eq("id", old.project_id).maybeSingle() : { data: null };
    if (current) redirect(`/${current.slug}${to ? `?to=${encodeURIComponent(to)}` : ""}`);
    notFound();
  }

  // Pencarian tamu, acara, dan lisensi pemilik tidak saling bergantung, jadi diambil bersamaan
  const [{ data: lookup }, { data: allEvents }, { data: lic }] = await Promise.all([
    to ? admin.rpc("rsvp_lookup", { p_slug: slug, p_name: to }) : Promise.resolve({ data: null }),
    admin.from("wedding_events").select("*").eq("project_id", project.id).order("sort_order").order("starts_at"),
    admin.from("licenses").select("ends_at").eq("user_id", project.owner_id).eq("status", "active"),
  ]);
  const found = lookup as Lookup | null;
  const guest = found?.matches === 1 ? found.guest! : null;
  const { data: invites } = guest ? await admin.from("guest_event_invites").select("event_id").eq("guest_id", guest.id) : { data: [] as { event_id: string }[] };
  const ids = (invites ?? []).map((i) => i.event_id);
  const events = (allEvents ?? []).filter((e) => !ids.length || ids.includes(e.id));
  const tz = project.timezone;

  // Tetap berjalan 30 hari setelah masa aktif owner habis, tutup bila dicabut
  const open = !project.archived_at && (lic ?? []).some((l) => !l.ends_at || Date.parse(l.ends_at) + 30 * 86_400_000 > Date.now());
  const deadlinePassed = !!project.rsvp_deadline && todayISO(tz) > project.rsvp_deadline;

  const cover = project.cover_image_path ? await getDownloadUrl(project.cover_image_path, { expiresIn: 3600 }) : null;

  return (
    <RsvpView themeId={project.rsvp_template} partners={[partnerOf(project.partner_one_name, project.partner_one_nickname), partnerOf(project.partner_two_name, project.partner_two_nickname)]} guestName={to || null} cover={cover} coverAlt={`Foto ${project.title}`} events={events} tz={tz}>
      {!open ? (
        <p className="text-center text-sm text-[var(--rv-muted)]">Konfirmasi kehadiran untuk acara ini sudah ditutup.</p>
      ) : deadlinePassed ? (
        <p className="text-center text-sm text-[var(--rv-muted)]">Batas waktu konfirmasi kehadiran sudah lewat. Terima kasih atas doa dan restunya.</p>
      ) : (
        <RsvpForm
          slug={slug}
          defaultName={to}
          paxMax={guest?.pax_invited ?? 5}
          initial={guest && guest.rsvp_status !== "belum_respon" ? { status: guest.rsvp_status, pax: guest.pax_confirmed || 1, message: "" } : null}
        />
      )}
    </RsvpView>
  );
}
