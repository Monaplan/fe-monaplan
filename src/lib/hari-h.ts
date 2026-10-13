import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Data Mode Hari H. Dipakai halaman anggota (klien Supabase dengan RLS) dan tautan panitia (service role setelah token cocok).
export type DayEvent = { id: string; name: string; starts_at: string | null; ends_at: string | null; venue_name: string | null };
export type DayRundown = { id: string; event_id: string; start_time: string; end_time: string | null; title: string; description: string | null; pic_name: string | null; location: string | null; vendor_id: string | null };
export type DayVendor = { id: string; name: string; category: string; phone_e164: string | null; contact_person: string | null };
export type DayTask = { id: string; title: string; status: string };
export type Attendance = { invitedGuests: number; expectedPax: number; checkedIn: number; checkedPax: number };
export type DayData = {
  title: string; tz: string; weddingDate: string | null;
  events: DayEvent[]; rundown: DayRundown[]; vendors: DayVendor[]; tasks: DayTask[];
  // null bila kolom check-in (migrasi 20261013000006) belum ada
  attendance: Attendance | null;
  loadedAt: string;
};

type ProjectLite = { id: string; title: string; timezone: string; wedding_date: string | null };

export async function loadDayData(db: SupabaseClient, project: ProjectLite): Promise<DayData> {
  const pid = project.id;
  const [events, rundown, vendors, tasks, guests] = await Promise.all([
    db.from("wedding_events").select("id, name, starts_at, ends_at, venue_name").eq("project_id", pid).order("starts_at", { nullsFirst: false }).order("sort_order"),
    db.from("rundown_items").select("id, event_id, start_time, end_time, title, description, pic_name, location, vendor_id").eq("project_id", pid).order("start_time").order("sort_order"),
    db.from("vendors").select("id, name, category, phone_e164, contact_person").eq("project_id", pid).eq("status", "deal").order("category").order("name"),
    db.from("tasks").select("id, title, status").eq("project_id", pid).eq("phase_key", "hari_h").order("sort_order").order("created_at"),
    db.from("guests").select("rsvp_status, pax_confirmed, checked_in_at, checked_in_pax").eq("project_id", pid).limit(5000),
  ]);

  let attendance: Attendance | null = null;
  if (!guests.error) {
    const rows = guests.data ?? [];
    const hadir = rows.filter((g) => g.rsvp_status === "hadir");
    const ins = rows.filter((g) => g.checked_in_at);
    attendance = {
      invitedGuests: hadir.length,
      expectedPax: hadir.reduce((s, g) => s + (g.pax_confirmed ?? 0), 0),
      checkedIn: ins.length,
      checkedPax: ins.reduce((s, g) => s + (g.checked_in_pax ?? 0), 0),
    };
  }

  return {
    title: project.title, tz: project.timezone, weddingDate: project.wedding_date,
    events: (events.data ?? []) as DayEvent[], rundown: (rundown.data ?? []) as DayRundown[], vendors: (vendors.data ?? []) as DayVendor[], tasks: (tasks.data ?? []) as DayTask[],
    attendance, loadedAt: new Date().toISOString(),
  };
}

// Tautan panitia hidup bila token cocok, proyek tidak diarsipkan, dan lisensi pemilik aktif atau berakhir kurang dari 30 hari
// (aturan sama dengan halaman RSVP). Mengembalikan proyek atau null.
export async function projectByStaffToken(admin: SupabaseClient, token: string) {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) return null;
  const { data: project, error } = await admin.from("wedding_projects").select("*").eq("staff_token", token).maybeSingle();
  if (error || !project || project.archived_at) return null;
  const { data: lic } = await admin.from("licenses").select("ends_at").eq("user_id", project.owner_id).eq("status", "active");
  const open = (lic ?? []).some((l) => !l.ends_at || Date.parse(l.ends_at) + 30 * 86_400_000 > Date.now());
  return open ? project : null;
}
