import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Shirt } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateLong, formatTime, todayISO } from "@/lib/format";
import { RsvpForm } from "./rsvp-form";
import { getDownloadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Konfirmasi Kehadiran", robots: { index: false, follow: false } };

export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) notFound();
  const admin = createAdminClient();

  const { data: guest } = await admin
    .from("guests")
    .select("id, name, pax_invited, rsvp_status, pax_confirmed, rsvp_message, project_id")
    .eq("rsvp_token", token)
    .maybeSingle();
  if (!guest) notFound();

  const [{ data: project }, { data: invites }, { data: allEvents }] = await Promise.all([
    admin.from("wedding_projects").select("title, owner_id, timezone, rsvp_deadline, cover_image_path, archived_at, partner_one_name, partner_two_name").eq("id", guest.project_id).single(),
    admin.from("guest_event_invites").select("event_id").eq("guest_id", guest.id),
    admin.from("wedding_events").select("*").eq("project_id", guest.project_id).order("sort_order").order("starts_at"),
  ]);
  if (!project) notFound();

  const ids = (invites ?? []).map((i) => i.event_id);
  const events = (allEvents ?? []).filter((e) => !ids.length || ids.includes(e.id));
  const tz = project.timezone;

  // Tetap berjalan 30 hari setelah masa aktif owner habis, tutup bila dicabut (PRD 6.2 aturan 7 dan 8)
  const { data: lic } = await admin.from("licenses").select("ends_at").eq("user_id", project.owner_id).eq("status", "active");
  const open = !project.archived_at && (lic ?? []).some((l) => !l.ends_at || Date.parse(l.ends_at) + 30 * 86_400_000 > Date.now());
  const deadlinePassed = !!project.rsvp_deadline && todayISO(tz) > project.rsvp_deadline;

  const cover = project.cover_image_path ? await getDownloadUrl(project.cover_image_path, { expiresIn: 3600 }) : null;

  return (
    <main className="min-h-dvh bg-plum-50 px-4 py-8">
      <div className="mx-auto max-w-[480px]">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={`Foto ${project.title}`} className="mb-6 aspect-[4/5] w-full rounded-2xl object-cover" />
        )}
        <p className="text-center text-[11px] font-semibold tracking-[0.08em] text-plum-600 uppercase">The Wedding of</p>
        <h1 className="mt-1 text-center font-display text-[36px] leading-[44px] font-medium text-neutral-900">{project.title}</h1>
        <h2 className="mt-6 text-xl font-semibold text-neutral-900">Halo, {guest.name}</h2>
        <p className="mt-1 text-sm text-neutral-600">Dengan penuh rasa syukur, kami mengundangmu untuk hadir di hari bahagia kami.</p>

        <div className="mt-5 flex flex-col gap-3">
          {events.map((e) => (
            <div key={e.id} className="rounded-lg border border-neutral-200 bg-surface p-4">
              <p className="font-display text-xl font-semibold text-plum-700">{e.name}</p>
              <ul className="mt-2 space-y-1.5 text-sm text-neutral-700">
                {e.starts_at && <li className="flex items-center gap-2"><CalendarDays className="size-4 text-plum-500" />{formatDateLong(e.starts_at, tz)}</li>}
                {e.starts_at && <li className="flex items-center gap-2"><Clock className="size-4 text-plum-500" />{formatTime(e.starts_at, tz)}{e.ends_at && ` sampai ${formatTime(e.ends_at, tz)}`}</li>}
                {(e.venue_name || e.venue_address) && <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-plum-500" /><span>{e.venue_name}{e.venue_address && <span className="block text-[13px] text-neutral-500">{e.venue_address}</span>}</span></li>}
                {e.dress_code && <li className="flex items-center gap-2"><Shirt className="size-4 text-plum-500" />Dress code: {e.dress_code}</li>}
              </ul>
              {e.maps_url && (
                <a href={e.maps_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-neutral-100 px-4 text-[13px] font-medium text-neutral-800 hover:bg-neutral-200">
                  <MapPin className="size-4" />Buka Maps
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-surface p-5">
          {!open ? (
            <p className="text-center text-sm text-neutral-600">Konfirmasi kehadiran untuk acara ini sudah ditutup.</p>
          ) : deadlinePassed ? (
            <p className="text-center text-sm text-neutral-600">Batas waktu konfirmasi kehadiran sudah lewat. Terima kasih atas doa dan restunya.</p>
          ) : (
            <RsvpForm
              token={token}
              paxMax={guest.pax_invited}
              initial={guest.rsvp_status === "belum_respon" ? null : { status: guest.rsvp_status, pax: guest.pax_confirmed || 1, message: guest.rsvp_message ?? "" }}
            />
          )}
        </div>
        <p className="mt-8 text-center text-xs text-neutral-400">Dibuat dengan Monaplan</p>
      </div>
    </main>
  );
}
