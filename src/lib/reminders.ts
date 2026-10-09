import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appUrl } from "@/lib/constants";
import { sendTemplated } from "@/lib/email";
import { renderEmail, type EmailData, type Lang } from "@/lib/email/templates";
import { addDaysISO, formatDateLong, formatIDR, formatTime } from "@/lib/format";
import { projectPath } from "@/lib/paths";

// Pengingat terjadwal (dipanggil berkala oleh /api/cron/reminders).
// Setiap pengingat membuat notifikasi dalam aplikasi, dan email lewat Resend bila pengguna mengaktifkannya.
// dedupe_key unik menjamin satu pengingat hanya sekali walau penjadwal berjalan berulang.

type Candidate = {
  userId: string;
  projectId?: string | null;
  linkPath: string;
  key: string; // tanpa akhiran kanal dan pengguna
  type: string;
  build: (lang: Lang, name: string) => EmailData;
};

type Profile = { id: string; email: string; full_name: string | null; notify_email: boolean; language?: string | null };

function localParts(tz: string, d = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(d)) % 24;
  return { date, hour };
}

async function pool<T>(items: T[], size: number, worker: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) await worker(items[i++]!);
  }));
}

export async function runReminders(admin: SupabaseClient, now = new Date()) {
  const base = appUrl();
  const cands: Candidate[] = [];

  const [{ data: projects }, { data: members }, { data: profiles }] = await Promise.all([
    admin.from("wedding_projects").select("*").is("archived_at", null),
    admin.from("project_members").select("project_id, user_id, role"),
    admin.from("profiles").select("*"),
  ]);
  const prof = new Map<string, Profile>((profiles ?? []).map((p: Profile) => [p.id, p]));
  const writers = (pid: string) => (members ?? []).filter((m) => m.project_id === pid && m.role !== "viewer").map((m) => m.user_id as string);
  const link = (p: { id: string; slug?: string | null }, sub: string) => projectPath(p, sub);
  const url = (path: string) => `${base}${path}`;

  for (const p of projects ?? []) {
    const { date: today, hour } = localParts(p.timezone, now);

    // Tugas H-3 dan H-0, mulai pukul 08.00 waktu proyek
    if (hour >= 8) {
      const { data: tasks } = await admin.from("tasks").select("id, title, due_date, assignee_id")
        .eq("project_id", p.id).neq("status", "done").in("due_date", [today, addDaysISO(today, 3)]);
      for (const t of tasks ?? []) {
        const dueIn = t.due_date === today ? 0 : 3;
        cands.push({
          userId: t.assignee_id ?? p.owner_id, projectId: p.id, linkPath: link(p, "checklist"), type: "task_due", key: `task_due:${t.id}:H-${dueIn}`,
          build: (_l, name) => ({ kind: "task_due", name, title: t.title, dueIn: dueIn as 0 | 3, url: url(link(p, "checklist")) }),
        });
      }

      // Pembayaran vendor H-7 dan H-1
      const { data: pays } = await admin.from("expense_payments").select("id, label, amount_idr, due_date, vendors(name)")
        .eq("project_id", p.id).eq("status", "belum_bayar").in("due_date", [addDaysISO(today, 1), addDaysISO(today, 7)]);
      for (const pay of pays ?? []) {
        const dueIn = pay.due_date === addDaysISO(today, 1) ? 1 : 7;
        for (const uid of writers(p.id)) {
          cands.push({
            userId: uid, projectId: p.id, linkPath: link(p, "budget"), type: "payment_due", key: `payment_due:${pay.id}:H-${dueIn}`,
            build: (_l, name) => ({ kind: "payment_due", name, payee: (pay as any).vendors?.name ?? pay.label ?? "Vendor", amount: formatIDR(pay.amount_idr), dueIn: dueIn as 1 | 7, url: url(link(p, "budget")) }),
          });
        }
      }
    }

    // Ringkasan RSVP harian pukul 19.00
    if (hour >= 19) {
      const since = new Date(now.getTime() - 24 * 3600_000).toISOString();
      const { data: rsvps } = await admin.from("guests").select("rsvp_status, pax_confirmed").eq("project_id", p.id).gte("rsvp_responded_at", since);
      if (rsvps?.length) {
        const hadir = rsvps.filter((r) => r.rsvp_status === "hadir");
        const pax = hadir.reduce((s, r) => s + r.pax_confirmed, 0);
        cands.push({
          userId: p.owner_id, projectId: p.id, linkPath: link(p, "tamu"), type: "rsvp_digest", key: `rsvp_digest:${p.id}:${today}`,
          build: (_l, name) => ({ kind: "rsvp_digest", name, couple: p.title, responses: rsvps.length, attending: hadir.length, pax, url: url(link(p, "tamu")) }),
        });
      }
    }
  }

  // Agenda sesuai pengaturan pengingat masing-masing
  const horizon = new Date(now.getTime() + 8 * 86_400_000).toISOString();
  const { data: agendas } = await admin.from("agenda_items").select("*").gte("starts_at", now.toISOString()).lte("starts_at", horizon);
  const projById = new Map((projects ?? []).map((p) => [p.id, p]));
  for (const a of agendas ?? []) {
    const p = projById.get(a.project_id);
    if (!p || !a.created_by) continue;
    for (const off of (a.remind_offsets_minutes as number[] | null) ?? []) {
      if (now.getTime() < Date.parse(a.starts_at) - off * 60_000) continue;
      cands.push({
        userId: a.created_by, projectId: p.id, linkPath: link(p, "kalender"), type: "agenda", key: `agenda:${a.id}:${off}`,
        build: (_l, name) => ({
          kind: "agenda_reminder", name, title: a.title, offsetMinutes: off, location: a.location, url: url(link(p, "kalender")),
          startsAt: `${formatDateLong(a.starts_at, p.timezone)}${a.all_day ? "" : ` · ${formatTime(a.starts_at, p.timezone)}`}`,
        }),
      });
    }
  }

  // Trial: pengingat 1 hari sebelum habis dan saat berakhir
  const { data: trials } = await admin.from("licenses").select("id, user_id, ends_at")
    .eq("status", "active").eq("source", "trial").not("ends_at", "is", null)
    .gte("ends_at", new Date(now.getTime() - 3 * 86_400_000).toISOString()).lte("ends_at", new Date(now.getTime() + 2 * 86_400_000).toISOString());
  for (const l of trials ?? []) {
    const { count } = await admin.from("licenses").select("*", { count: "exact", head: true }).eq("user_id", l.user_id).eq("status", "active").is("ends_at", null);
    if (count) continue; // sudah punya akses selamanya
    const left = Math.ceil((Date.parse(l.ends_at!) - now.getTime()) / 86_400_000);
    if (left <= 0) {
      cands.push({ userId: l.user_id, linkPath: "/aktivasi", type: "trial_ended", key: `trial_ended:${l.id}`, build: (_l, name) => ({ kind: "trial_ended", name, url: url("/aktivasi") }) });
    } else if (left <= 1) {
      cands.push({ userId: l.user_id, linkPath: "/aktivasi", type: "trial_ending", key: `trial_ending:${l.id}`, build: (_l, name) => ({ kind: "trial_ending", name, daysLeft: left, url: url("/aktivasi") }) });
    }
  }

  let created = 0, emailed = 0, failed = 0;
  await pool(cands, 5, async (c) => {
    const u = prof.get(c.userId);
    if (!u) return;
    const lang: Lang = u.language === "en" ? "en" : "id";
    const name = u.full_name ?? u.email.split("@")[0]!;
    const data = c.build(lang, name);
    const r = renderEmail(lang, data, { appUrl: base });

    // Notifikasi dalam aplikasi: dedupe_key unik sehingga pemanggilan ulang tidak menggandakan
    const inapp = await admin.from("notifications")
      .upsert({ user_id: c.userId, project_id: c.projectId ?? null, type: c.type, title: r.title, body: r.body, link_path: c.linkPath, channel: "in_app", dedupe_key: `${c.key}:${c.userId}:in_app` }, { onConflict: "dedupe_key", ignoreDuplicates: true })
      .select("id");
    if (inapp.data?.length) created++;

    if (!u.notify_email) return;
    // Baris email dibuat dulu: hanya pemanggil yang berhasil menyisipkannya yang mengirim, jadi tidak ada email ganda
    const row = await admin.from("notifications")
      .upsert({ user_id: c.userId, project_id: c.projectId ?? null, type: c.type, title: r.title, body: r.body, link_path: c.linkPath, channel: "email", dedupe_key: `${c.key}:${c.userId}:email` }, { onConflict: "dedupe_key", ignoreDuplicates: true })
      .select("id");
    const id = row.data?.[0]?.id;
    if (!id) return;
    const ok = await sendTemplated(u.email, lang, data);
    if (ok) {
      await admin.from("notifications").update({ sent_at: new Date().toISOString() }).eq("id", id);
      emailed++;
    } else {
      // Gagal kirim (mis. kunci Resend kosong atau domain belum terverifikasi): hapus baris agar dicoba lagi di putaran berikutnya
      await admin.from("notifications").delete().eq("id", id);
      failed++;
    }
  });

  return { candidates: cands.length, created, emailed, failed };
}
