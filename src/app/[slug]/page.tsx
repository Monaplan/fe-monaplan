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
import { ttl } from "@/lib/ttl-cache";
import { keyMatches, normalizeKey } from "@/lib/invite-key";

export const dynamic = "force-dynamic";
export const metadata = { title: "Undangan Pernikahan", robots: { index: false, follow: false } };

// Nama dari ?to= hanya untuk ditampilkan: karakter kontrol dibuang, spasi dirapikan, panjang dibatasi
const cleanName = (v: string | string[] | undefined) => {
  const raw = Array.isArray(v) ? v[0] : v;
  return (raw ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
};

// Data undangan yang sama untuk semua tamu (proyek, acara, lisensi pemilik, foto sampul) disimpan singkat di memori:
// tautan yang disebar ke ratusan tamu dalam beberapa menit tidak perlu mengulang empat kueri yang sama. Perubahan dari
// pengantin terlihat paling lambat setelah 20 detik. Slug yang tidak ada tidak disimpan, supaya alamat acak tidak menumpuk di memori.
class MissingProject extends Error {}
async function loadShared(slug: string) {
  const admin = createAdminClient();
  const { data: project } = await admin.from("wedding_projects").select("*").eq("slug", slug).maybeSingle();
  if (!project) throw new MissingProject();
  const [{ data: allEvents }, { data: lic }, cover] = await Promise.all([
    admin.from("wedding_events").select("*").eq("project_id", project.id).order("sort_order").order("starts_at"),
    admin.from("licenses").select("ends_at").eq("user_id", project.owner_id).eq("status", "active"),
    project.cover_image_path ? getDownloadUrl(project.cover_image_path, { expiresIn: 3600 }) : Promise.resolve(null),
  ]);
  return { project, allEvents: allEvents ?? [], lic: lic ?? [], cover };
}

type Lookup = { matches: number; guest?: { id: string; name: string; pax_invited: number; rsvp_status: string; pax_confirmed: number } };

// Undangan publik: domain/slug-pengantin?to=Nama Tamu
export default async function InvitePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ to?: string | string[]; k?: string | string[] }> }) {
  const { slug: rawSlug } = await params;
  const sp = await searchParams;
  const to = cleanName(sp.to);
  // Kunci tamu dari tautan pribadi (?k=): dibawa terus saat dialihkan dan diperiksa terhadap kode check-in tamu
  const k = normalizeKey(Array.isArray(sp.k) ? sp.k[0] : sp.k);
  const query = to ? `?to=${encodeURIComponent(to)}${k ? `&k=${k}` : ""}` : "";
  // Tautan yang tertulis dengan huruf besar (mis. dibagikan lewat aplikasi yang mengubah huruf) diarahkan ke bentuk kecil
  const slug = rawSlug.toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length > 60) notFound();
  if (slug !== rawSlug) redirect(`/${slug}${query}`);
  // Halaman ini menyentuh database untuk setiap alamat satu segmen, jadi pemindaian alamat acak dibatasi per IP
  if (rateLimited(`invite:${clientIp(await headers()) ?? "unknown"}`, 90)) notFound();
  const admin = createAdminClient();

  let shared: Awaited<ReturnType<typeof loadShared>>;
  try {
    shared = await ttl(`invite:${slug}`, 20_000, () => loadShared(slug));
  } catch (e) {
    if (!(e instanceof MissingProject)) throw e;
    // Alamat lama diarahkan ke alamat baru
    const { data: old } = await admin.from("project_slug_history").select("project_id").eq("slug", slug).maybeSingle();
    const { data: current } = old ? await admin.from("wedding_projects").select("slug").eq("id", old.project_id).maybeSingle() : { data: null };
    if (current) redirect(`/${current.slug}${query}`);
    notFound();
  }
  const { project, allEvents, lic, cover } = shared;

  // Pencarian nama berbeda untuk setiap tamu, jadi tidak ikut disimpan
  const { data: lookup } = to ? await admin.rpc("rsvp_lookup", { p_slug: slug, p_name: to }) : { data: null };
  const found = lookup as Lookup | null;
  const guest = found?.matches === 1 ? found.guest! : null;
  const [{ data: invites }, { data: codeRow }] = await Promise.all([
    guest ? admin.from("guest_event_invites").select("event_id").eq("guest_id", guest.id) : Promise.resolve({ data: [] as { event_id: string }[] }),
    // Kunci tamu = kode check-in (kolom ada setelah migrasi 20261013000006; galat diabaikan)
    guest ? admin.from("guests").select("checkin_code").eq("id", guest.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const guestCode = (codeRow as { checkin_code?: string } | null)?.checkin_code ?? null;
  // Tanpa kunci yang cocok, nama saja tidak membuka jawaban yang sudah tersimpan, QR masuk, atau perubahan jawaban
  const keyOk = !!guest && keyMatches(k, guestCode);
  const answered = !!guest && guest.rsvp_status !== "belum_respon";
  const ids = (invites ?? []).map((i) => i.event_id);
  const events = allEvents.filter((e) => !ids.length || ids.includes(e.id));
  const tz = project.timezone;

  // Tetap berjalan 30 hari setelah masa aktif owner habis, tutup bila dicabut
  const open = !project.archived_at && lic.some((l) => !l.ends_at || Date.parse(l.ends_at) + 30 * 86_400_000 > Date.now());
  const deadlinePassed = !!project.rsvp_deadline && todayISO(tz) > project.rsvp_deadline;

  return (
    <RsvpView themeId={project.rsvp_template} partners={[partnerOf(project.partner_one_name, project.partner_one_nickname), partnerOf(project.partner_two_name, project.partner_two_nickname)]} guestName={to || null} cover={cover} coverAlt={`Foto ${project.title}`} events={events} tz={tz}>
      {!open ? (
        <p className="text-center text-sm text-[var(--rv-muted)]">Konfirmasi kehadiran untuk acara ini sudah ditutup.</p>
      ) : deadlinePassed ? (
        <p className="text-center text-sm text-[var(--rv-muted)]">Batas waktu konfirmasi kehadiran sudah lewat. Terima kasih atas doa dan restunya.</p>
      ) : answered && !keyOk ? (
        <p className="text-center text-sm leading-6 text-[var(--rv-muted)]">Jawaban untuk nama ini sudah tersimpan. Untuk melihat atau mengubahnya, buka tautan undangan pribadi yang dikirim oleh pengantin.</p>
      ) : (
        <RsvpForm
          slug={slug}
          defaultName={to}
          paxMax={guest?.pax_invited ?? 5}
          initial={keyOk && guest && answered ? { status: guest.rsvp_status, pax: guest.pax_confirmed || 1, message: "" } : null}
          initialCode={keyOk && guest?.rsvp_status === "hadir" ? guestCode : null}
          guestKey={keyOk ? k : undefined}
        />
      )}
    </RsvpView>
  );
}
