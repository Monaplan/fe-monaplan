// Edge Function send-reminders (PRD bagian 9). Dipanggil pg_cron tiap 15 menit.
// Membuat baris notifications dengan dedupe_key unik, lalu mengirim email yang belum terkirim.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const APP_URL = (Deno.env.get("APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Monaplan <onboarding@resend.dev>";

type Notif = { user_id: string; project_id?: string | null; type: string; title: string; body?: string; link_path?: string; channel: "in_app" | "email"; dedupe_key: string };

function localParts(tz: string, d = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(d));
  return { date, hour };
}
function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const idr = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

async function push(rows: Notif[]) {
  for (let i = 0; i < rows.length; i += 500) {
    await supabase.from("notifications").upsert(rows.slice(i, i + 500), { onConflict: "dedupe_key", ignoreDuplicates: true });
  }
}

// Kanal in-app selalu, email bila user mengaktifkan notify_email
function both(n: Omit<Notif, "channel" | "dedupe_key">, key: string, emailOk: boolean): Notif[] {
  const out: Notif[] = [{ ...n, channel: "in_app", dedupe_key: `${key}:${n.user_id}:in_app` }];
  if (emailOk) out.push({ ...n, channel: "email", dedupe_key: `${key}:${n.user_id}:email` });
  return out;
}

Deno.serve(async () => {
  const now = new Date();
  const rows: Notif[] = [];

  const { data: projects } = await supabase.from("wedding_projects").select("id, title, owner_id, timezone").is("archived_at", null);
  const { data: members } = await supabase.from("project_members").select("project_id, user_id, role, profiles!project_members_user_id_fkey(notify_email)");
  const emailOk = new Map<string, boolean>();
  (members ?? []).forEach((m: any) => emailOk.set(m.user_id, m.profiles?.notify_email ?? true));
  const writers = (pid: string) => (members ?? []).filter((m: any) => m.project_id === pid && m.role !== "viewer").map((m: any) => m.user_id as string);

  for (const p of projects ?? []) {
    const { date: today, hour } = localParts(p.timezone, now);
    const base = `/w/${p.id}`;

    // Tugas jatuh tempo H-3 dan H-0 pukul 08.00 waktu proyek
    if (hour >= 8) {
      const { data: tasks } = await supabase.from("tasks").select("id, title, due_date, assignee_id")
        .eq("project_id", p.id).neq("status", "done").in("due_date", [today, addDays(today, 3)]);
      for (const t of tasks ?? []) {
        const tag = t.due_date === today ? "H-0" : "H-3";
        const uid = t.assignee_id ?? p.owner_id;
        rows.push(...both({ user_id: uid, project_id: p.id, type: "task_due", title: `Tugas jatuh tempo ${t.due_date === today ? "hari ini" : "3 hari lagi"}`, body: t.title, link_path: `${base}/checklist` },
          `task_due:${t.id}:${tag}`, emailOk.get(uid) ?? true));
      }
      // Ringkasan tugas terlambat harian (in-app)
      const { count } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("project_id", p.id).neq("status", "done").lt("due_date", today);
      if (count) {
        for (const uid of writers(p.id)) {
          rows.push({ user_id: uid, project_id: p.id, type: "task_overdue", title: `${count} tugas terlambat`, body: "Cek checklist dan perbarui due date bila perlu.", link_path: `${base}/checklist`, channel: "in_app", dedupe_key: `task_overdue:${p.id}:${today}:${uid}` });
        }
      }
      // Pembayaran vendor H-7 dan H-1
      const { data: pays } = await supabase.from("expense_payments").select("id, label, amount_idr, due_date, vendors(name)")
        .eq("project_id", p.id).eq("status", "belum_bayar").in("due_date", [addDays(today, 1), addDays(today, 7)]);
      for (const pay of pays ?? []) {
        const tag = pay.due_date === addDays(today, 1) ? "H-1" : "H-7";
        for (const uid of writers(p.id)) {
          rows.push(...both({ user_id: uid, project_id: p.id, type: "payment_due", title: `Pembayaran jatuh tempo ${tag === "H-1" ? "besok" : "7 hari lagi"}`, body: `${(pay as any).vendors?.name ?? pay.label ?? "Vendor"} · ${idr(pay.amount_idr)}`, link_path: `${base}/budget` },
            `payment_due:${pay.id}:${tag}`, emailOk.get(uid) ?? true));
        }
      }
    }

    // Ringkasan RSVP harian pukul 19.00
    if (hour >= 19) {
      const since = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
      const { data: rsvps } = await supabase.from("guests").select("rsvp_status, pax_confirmed").eq("project_id", p.id).gte("rsvp_responded_at", since);
      if (rsvps?.length) {
        const hadir = rsvps.filter((r) => r.rsvp_status === "hadir");
        rows.push(...both({ user_id: p.owner_id, project_id: p.id, type: "rsvp_digest", title: `${rsvps.length} RSVP baru hari ini`, body: `${hadir.length} hadir (${hadir.reduce((s, r) => s + r.pax_confirmed, 0)} pax)`, link_path: `${base}/tamu` },
          `rsvp_digest:${p.id}:${today}`, emailOk.get(p.owner_id) ?? true));
      }
    }
  }

  // Agenda manual sesuai pengaturan pengingat
  const horizon = new Date(now.getTime() + 8 * 86_400_000).toISOString();
  const { data: agendas } = await supabase.from("agenda_items").select("id, project_id, title, starts_at, remind_offsets_minutes, created_by")
    .gte("starts_at", now.toISOString()).lte("starts_at", horizon);
  for (const a of agendas ?? []) {
    if (!a.created_by) continue;
    for (const off of a.remind_offsets_minutes ?? []) {
      if (now.getTime() >= Date.parse(a.starts_at) - off * 60_000) {
        rows.push(...both({ user_id: a.created_by, project_id: a.project_id, type: "agenda", title: `Pengingat: ${a.title}`, body: off ? `Dimulai ${off >= 1440 ? `${off / 1440} hari` : `${off / 60} jam`} lagi` : "Dimulai sekarang", link_path: `/w/${a.project_id}/kalender` },
          `agenda:${a.id}:${off}`, emailOk.get(a.created_by) ?? true));
      }
    }
  }

  // Masa aktif (khusus paket bermasa aktif): H-14, H-3, dan saat berakhir
  const { data: licenses } = await supabase.from("licenses").select("id, user_id, ends_at, profiles!licenses_user_id_fkey(notify_email)")
    .eq("status", "active").not("ends_at", "is", null)
    .gte("ends_at", new Date(now.getTime() - 86_400_000).toISOString()).lte("ends_at", new Date(now.getTime() + 15 * 86_400_000).toISOString());
  for (const l of licenses ?? []) {
    // Lewati bila ada lisensi lain yang menyambung (perpanjangan) atau lisensi selamanya
    const { count } = await supabase.from("licenses").select("*", { count: "exact", head: true })
      .eq("user_id", l.user_id).eq("status", "active").or(`ends_at.is.null,ends_at.gt.${l.ends_at}`);
    if (count) continue;
    const left = Math.ceil((Date.parse(l.ends_at!) - now.getTime()) / 86_400_000);
    const ok = (l as any).profiles?.notify_email ?? true;
    if (left <= 0) {
      rows.push(...both({ user_id: l.user_id, type: "license_expired", title: "Akses telah berakhir", body: "Data tetap aman dan bisa diekspor. Perpanjang untuk kembali mengedit.", link_path: "/aktivasi" }, `license_expired:${l.id}`, ok));
    } else if (left <= 3 || (left <= 14 && left > 11)) {
      const tag = left <= 3 ? "H-3" : "H-14";
      rows.push(...both({ user_id: l.user_id, type: "license_expiring", title: `Akses berakhir ${left} hari lagi`, body: "Perpanjang atau upgrade ke Selamanya agar tetap bisa mengedit.", link_path: "/aktivasi" }, `license_expiring:${l.id}:${tag}`, ok));
    }
  }

  await push(rows);

  // Kirim email yang belum terkirim
  let sent = 0;
  if (RESEND_API_KEY) {
    const { data: pending } = await supabase.from("notifications").select("id, title, body, link_path, profiles(email)")
      .eq("channel", "email").is("sent_at", null).lte("scheduled_for", now.toISOString()).limit(100);
    for (const n of pending ?? []) {
      const to = (n as any).profiles?.email;
      if (!to) continue;
      const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1C1619">
        <div style="font-family:Georgia,serif;font-size:22px;color:#8C3A63">Monaplan</div>
        <h1 style="font-size:18px">${n.title}</h1><p style="color:#43393E">${n.body ?? ""}</p>
        ${n.link_path ? `<a href="${APP_URL}${n.link_path}" style="display:inline-block;background:#8C3A63;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none">Buka Monaplan</a>` : ""}
      </div>`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EMAIL_FROM, to, subject: n.title, html }),
      });
      if (res.ok) {
        await supabase.from("notifications").update({ sent_at: new Date().toISOString() }).eq("id", n.id);
        sent++;
      }
    }
  }

  return new Response(JSON.stringify({ created: rows.length, emailed: sent }), { headers: { "Content-Type": "application/json" } });
});
