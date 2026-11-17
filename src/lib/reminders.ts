import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appUrl, PAYMENT_KIND, PHASE_LABEL, TASK_PRIORITY, labelOf } from "@/lib/constants";
import { sendTemplated } from "@/lib/email";
import { renderEmail, type DigestAgenda, type DigestPayment, type DigestTask, type EmailData, type Lang } from "@/lib/email/templates";
import { addDaysISO, diffDays, formatDateCompact, formatDateLong, formatIDR, formatTime } from "@/lib/format";
import { projectPath } from "@/lib/paths";
import { savingsPlan } from "@/lib/budget";
import { sendPush } from "@/lib/push";
import { fetchAll } from "@/lib/paginate";
import { getPricingContext, getSettings } from "@/lib/settings";
import { priceFor, promoExhausted, promoState } from "@/lib/pricing";

// Pengingat terjadwal (dipanggil berkala oleh /api/cron/reminders).
// - Notifikasi dalam aplikasi tetap satu per kegiatan.
// - Email agenda, tugas, dan pembayaran DIGABUNG menjadi satu ringkasan harian per ruang kerja, pukul 07.00 WIB.
// - Ringkasan RSVP pukul 19.00 WIB, email trial hanya saat masa coba berakhir.
// dedupe_key unik menjamin setiap notifikasi atau email hanya sekali walau penjadwal berjalan berulang.

type Profile = { id: string; email: string; full_name: string | null; notify_email: boolean; language?: string | null };
type InApp = { userId: string; projectId?: string | null; linkPath: string; key: string; type: string; build: (lang: Lang, name: string) => EmailData };
type Mail = { userId: string; projectId?: string | null; linkPath: string; key: string; type: string; build: (lang: Lang, name: string) => EmailData; inApp?: boolean };

const WIB = "Asia/Jakarta";
const DIGEST_HOUR = 7;
const RSVP_HOUR = 19;

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

const dueLabel = (lang: Lang, days: number) => {
  const id = lang === "id";
  if (days < 0) return id ? `Terlambat ${-days} hari` : `${-days} days late`;
  if (days === 0) return id ? "Hari ini" : "Today";
  if (days === 1) return id ? "Besok" : "Tomorrow";
  return id ? `${days} hari lagi` : `In ${days} days`;
};

export async function runReminders(admin: SupabaseClient, now = new Date()) {
  const base = appUrl();
  const inApp: InApp[] = [];
  const mail: Mail[] = [];

  const [{ data: projects }, { data: members }, { data: profiles }] = await Promise.all([
    fetchAll((a, b) => admin.from("wedding_projects").select("*").is("archived_at", null).order("id").range(a, b)),
    fetchAll((a, b) => admin.from("project_members").select("project_id, user_id, role").order("project_id").order("user_id").range(a, b)),
    fetchAll((a, b) => admin.from("profiles").select("*").order("id").range(a, b)),
  ]);
  // Pengguna yang sudah menyalakan notifikasi HP tidak perlu ajakan memasang di email (galat diabaikan bila tabel belum ada)
  const { data: pushRows } = await fetchAll((a, b) => admin.from("push_subscriptions").select("user_id").order("id").range(a, b));
  const hasPush = new Set((pushRows ?? []).map((r: { user_id: string }) => r.user_id));
  const prof = new Map<string, Profile>((profiles ?? []).map((p: Profile) => [p.id, p]));
  // Peta proyek ke penulisnya dibuat sekali: menyaring seluruh daftar anggota di setiap pemanggilan membuat putaran cron kuadratik
  const writersByProject = new Map<string, string[]>();
  for (const m of members ?? []) {
    if (m.role === "viewer") continue;
    const list = writersByProject.get(m.project_id as string);
    if (list) list.push(m.user_id as string); else writersByProject.set(m.project_id as string, [m.user_id as string]);
  }
  const writers = (pid: string) => writersByProject.get(pid) ?? [];
  const link = (p: { id: string; slug?: string | null }, sub?: string) => projectPath(p, sub);
  const url = (path: string) => `${base}${path}`;
  const wib = localParts(WIB, now);

  const horizon = new Date(now.getTime() + 8 * 86_400_000).toISOString();
  const { data: agendas } = await fetchAll((a, b) => admin.from("agenda_items").select("*").gte("starts_at", new Date(now.getTime() - 86_400_000).toISOString()).lte("starts_at", horizon).order("id").range(a, b));
  const agendaByProject = new Map<string, any[]>();
  for (const a of agendas ?? []) { const l = agendaByProject.get(a.project_id as string); if (l) l.push(a); else agendaByProject.set(a.project_id as string, [a]); }

  // Notifikasi yang sudah pernah dibuat dikenali dari dedupe_key. Kunci yang sudah ada diambil sekali per putaran, lalu
  // kandidat yang sudah selesai dilewati tanpa membangun isi, menyisipkan, atau mengirim ulang. Sebelumnya setiap kandidat
  // yang masih jatuh tempo hari itu disisipkan ulang di setiap putaran 15 menit (96 kali sehari).
  const keyOf = (c: { key: string; userId: string }, channel: "in_app" | "email") => `${c.key}:${c.userId}:${channel}`;
  const existingKeys = async (keys: string[]) => {
    const found = new Set<string>();
    const uniq = [...new Set(keys)];
    const chunks: string[][] = [];
    for (let i = 0; i < uniq.length; i += 40) chunks.push(uniq.slice(i, i + 40));
    await pool(chunks, 4, async (chunk) => {
      const { data } = await admin.from("notifications").select("dedupe_key").in("dedupe_key", chunk);
      for (const r of data ?? []) found.add(r.dedupe_key as string);
    });
    return found;
  };
  // Email gagal terkirim menghapus barisnya agar dicoba lagi, jadi email dihitung selesai hanya bila barisnya ada
  const keysFor = (c: { key: string; userId: string; inApp?: boolean }, mail: boolean) => {
    const u = prof.get(c.userId);
    if (!u) return [];
    return mail ? [...(c.inApp ? [keyOf(c, "in_app")] : []), ...(u.notify_email ? [keyOf(c, "email")] : [])] : [keyOf(c, "in_app")];
  };

  // Ringkasan RSVP: semua jawaban 24 jam terakhir dibaca sekali (bukan per proyek) dan hanya setelah pukul 19.00 WIB
  const rsvpByProject = new Map<string, any[]>();
  const rsvpDone = new Set<string>();
  if (wib.hour >= RSVP_HOUR) {
    const since = new Date(now.getTime() - 24 * 3600_000).toISOString();
    const { data: recent } = await fetchAll((a, b) => admin.from("guests").select("project_id, name, rsvp_status, pax_confirmed, rsvp_message, rsvp_responded_at").gte("rsvp_responded_at", since).order("rsvp_responded_at", { ascending: false }).order("id").range(a, b));
    for (const r of recent ?? []) { const l = rsvpByProject.get(r.project_id as string); if (l) l.push(r); else rsvpByProject.set(r.project_id as string, [r]); }
    const ownerOf = new Map((projects ?? []).map((p) => [p.id as string, p.owner_id as string]));
    const cands = [...rsvpByProject.keys()].filter((pid) => ownerOf.has(pid)).map((pid) => ({ pid, c: { key: `rsvp_digest:${pid}:${wib.date}`, userId: ownerOf.get(pid)!, inApp: true } }));
    const have = await existingKeys(cands.flatMap(({ c }) => keysFor(c, true)));
    for (const { pid, c } of cands) if (keysFor(c, true).every((k) => have.has(k))) rsvpDone.add(pid);
  }

  // Tugas dan pembayaran yang jatuh tempo dibaca SEKALI untuk semua proyek (bukan satu kueri per proyek di setiap
  // putaran 15 menit, yang menjadi pemakai kueri terbesar). Tanggal yang diminta adalah gabungan tanggal "hari ini"
  // di semua zona waktu proyek; tiap proyek menyaring lagi menurut tanggalnya sendiri.
  const zones = new Set((projects ?? []).map((p) => p.timezone as string));
  const taskDates = new Set<string>(), payDates = new Set<string>();
  for (const z of zones) {
    const { date } = localParts(z, now);
    taskDates.add(date); taskDates.add(addDaysISO(date, 3));
    payDates.add(addDaysISO(date, 1)); payDates.add(addDaysISO(date, 7));
  }
  const [{ data: dueTasks }, { data: duePays }] = zones.size
    ? await Promise.all([
      fetchAll((a, b) => admin.from("tasks").select("id, title, due_date, assignee_id, project_id, phase_key, priority").neq("status", "done").in("due_date", [...taskDates]).order("id").range(a, b)),
      fetchAll((a, b) => admin.from("expense_payments").select("id, label, kind, amount_idr, due_date, project_id, vendors(name)").eq("status", "belum_bayar").in("due_date", [...payDates]).order("id").range(a, b)),
    ])
    : [{ data: [] as any[] }, { data: [] as any[] }];
  const groupBy = (rows: any[] | null | undefined) => {
    const m = new Map<string, any[]>();
    for (const r of rows ?? []) { const l = m.get(r.project_id as string); if (l) l.push(r); else m.set(r.project_id as string, [r]); }
    return m;
  };
  const tasksByProject = groupBy(dueTasks), paysByProject = groupBy(duePays);

  // Proyek diproses beberapa sekaligus, bukan satu per satu, supaya putaran cron tetap selesai dalam batas waktu
  // saat jumlah proyek bertambah.
  await pool(projects ?? [], 8, async (p) => {
    const tz = p.timezone as string;
    const { date: today, hour } = localParts(tz, now);
    const projAgenda = agendaByProject.get(p.id as string) ?? [];
    const pTasks = (tasksByProject.get(p.id as string) ?? []).filter((t) => t.due_date === today || t.due_date === addDaysISO(today, 3));
    const pPays = (paysByProject.get(p.id as string) ?? []).filter((x) => x.due_date === addDaysISO(today, 1) || x.due_date === addDaysISO(today, 7));

    // ----- Notifikasi dalam aplikasi per kegiatan (mulai 08.00 waktu proyek) -----
    if (hour >= 8) {
      for (const t of pTasks) {
        const dueIn = t.due_date === today ? 0 : 3;
        inApp.push({ userId: t.assignee_id ?? p.owner_id, projectId: p.id, linkPath: link(p, "checklist"), type: "task_due", key: `task_due:${t.id}:H-${dueIn}`,
          build: (_l, name) => ({ kind: "task_due", name, title: t.title, dueIn: dueIn as 0 | 3, url: url(link(p, "checklist")) }) });
      }
      for (const pay of pPays) {
        const dueIn = pay.due_date === addDaysISO(today, 1) ? 1 : 7;
        for (const uid of writers(p.id)) {
          inApp.push({ userId: uid, projectId: p.id, linkPath: link(p, "budget"), type: "payment_due", key: `payment_due:${pay.id}:H-${dueIn}`,
            build: (_l, name) => ({ kind: "payment_due", name, payee: (pay as any).vendors?.name ?? pay.label ?? "Vendor", amount: formatIDR(pay.amount_idr), dueIn: dueIn as 1 | 7, url: url(link(p, "budget")) }) });
        }
      }
      // Target tabungan: tanggal 1 setiap bulan pukul 08.00 sampai 11.00 (cukup beberapa putaran cron), hanya bila kolom savings_idr ada (migrasi 20261013000003)
      if (today.endsWith("-01") && hour < 11 && (p.wedding_date || p.savings_deadline) && typeof p.savings_idr === "number") {
        const [{ data: bItems }, { data: bPays }] = await Promise.all([
          admin.from("budget_items").select("id, estimated_idr, actual_idr").eq("project_id", p.id),
          admin.from("expense_payments").select("budget_item_id, amount_idr, status").eq("project_id", p.id),
        ]);
        const plan = savingsPlan({ items: bItems ?? [], payments: bPays ?? [], savings: p.savings_idr, weddingDate: p.wedding_date, today, targetOverride: p.savings_target_idr, deadlineOverride: p.savings_deadline });
        if (plan.perMonth && plan.months) {
          for (const uid of writers(p.id)) {
            inApp.push({ userId: uid, projectId: p.id, linkPath: link(p, "tabungan"), type: "savings", key: `savings:${p.id}:${today.slice(0, 7)}`,
              build: (_l, name) => ({ kind: "savings_reminder", name, amount: formatIDR(plan.perMonth), months: plan.months!, url: url(link(p, "tabungan")) }) });
          }
        }
      }
    }
    // Agenda: notifikasi dalam aplikasi sesuai pengingat yang dipilih (pilihan "saat dimulai" sudah tidak dipakai)
    for (const a of projAgenda) {
      if (!a.created_by || Date.parse(a.starts_at) < now.getTime()) continue;
      for (const off of ((a.remind_offsets_minutes as number[] | null) ?? []).filter((m) => m > 0)) {
        if (now.getTime() < Date.parse(a.starts_at) - off * 60_000) continue;
        inApp.push({ userId: a.created_by, projectId: p.id, linkPath: link(p, "kalender"), type: "agenda", key: `agenda:${a.id}:${off}`,
          build: (_l, name) => ({ kind: "agenda_reminder", name, title: a.title, offsetMinutes: off, location: a.location, url: url(link(p, "kalender")),
            startsAt: `${formatDateLong(a.starts_at, tz)}${a.all_day ? "" : ` · ${formatTime(a.starts_at, tz)}`}` }) });
      }
    }

    // ----- Ringkasan harian lewat email, pukul 07.00 WIB -----
    if (wib.hour >= DIGEST_HOUR) {
      const tomorrow = addDaysISO(today, 1);
      const byDue = (a: { due_date: string }, b: { due_date: string }) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0);
      const dTasks = [...pTasks].sort(byDue);
      const dPays = [...pPays].sort(byDue);
      // Agenda hari ini dan besok, ditambah agenda 7 hari lagi yang meminta pengingat seminggu sebelumnya
      const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
      const dAgenda = projAgenda
        .filter((a) => { const d = dayOf(a.starts_at); return d === today || d === tomorrow || (d === addDaysISO(today, 7) && ((a.remind_offsets_minutes as number[] | null) ?? []).includes(10080)); })
        .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));

      if (dTasks?.length || dPays?.length || dAgenda.length) {
        const total = (dPays ?? []).reduce((s, x) => s + Number(x.amount_idr ?? 0), 0);
        for (const uid of writers(p.id)) {
          mail.push({
            userId: uid, projectId: p.id, linkPath: link(p), type: "daily_digest", key: `daily_digest:${p.id}:${today}`,
            build: (lang, name) => {
              const id = lang === "id";
              const agenda: DigestAgenda[] = dAgenda.map((a) => {
                const d = dayOf(a.starts_at);
                return {
                  time: a.all_day ? (id ? "Seharian" : "All day") : formatTime(a.starts_at, tz, false, lang),
                  end: !a.all_day && a.ends_at ? formatTime(a.ends_at, tz, false, lang) : null,
                  title: a.title, where: a.location, note: a.description,
                  soon: d === today ? null : dueLabel(lang, diffDays(today, d)),
                };
              });
              const tasks: DigestTask[] = (dTasks ?? []).map((t) => {
                const days = diffDays(today, t.due_date);
                return { title: t.title, meta: `${PHASE_LABEL[t.phase_key] ?? ""} · ${id ? "Prioritas" : "Priority"} ${labelOf(TASK_PRIORITY, t.priority).toLowerCase()}`, due: dueLabel(lang, days), tone: days <= 0 ? "danger" : "caution" };
              });
              const payments: DigestPayment[] = (dPays ?? []).map((x) => {
                const days = diffDays(today, x.due_date);
                return { vendor: (x as any).vendors?.name ?? x.label ?? "Vendor", meta: `${x.label?.trim() || labelOf(PAYMENT_KIND, x.kind)} · ${id ? "jatuh tempo" : "due"} ${formatDateCompact(x.due_date, tz, lang)}`,
                  amount: formatIDR(x.amount_idr), due: dueLabel(lang, days), tone: days <= 1 ? "danger" : "caution" };
              });
              return {
                kind: "daily_digest", name, couple: p.title, dateLabel: formatDateLong(today, tz, lang),
                daysToGo: p.wedding_date ? diffDays(today, p.wedding_date) : null,
                agenda, tasks, payments, paymentTotal: payments.length ? formatIDR(total) : null, url: url(link(p)), pushTip: !hasPush.has(uid),
              };
            },
          });
        }
      }
    }

    // ----- Ringkasan RSVP, pukul 19.00 WIB -----
    if (wib.hour >= RSVP_HOUR) {
      const rsvps = rsvpByProject.get(p.id as string);
      // Ringkasan hari ini yang sudah terkirim tidak dibangun ulang di setiap putaran (hemat dua kueri hitung per proyek)
      if (rsvps?.length && !rsvpDone.has(p.id as string)) {
        const [{ count: totalGuests }, { count: answered }] = await Promise.all([
          admin.from("guests").select("*", { count: "exact", head: true }).eq("project_id", p.id),
          admin.from("guests").select("*", { count: "exact", head: true }).eq("project_id", p.id).neq("rsvp_status", "belum_respon"),
        ]);
        const hadir = rsvps.filter((r) => r.rsvp_status === "hadir");
        const pax = hadir.reduce((s, r) => s + (r.pax_confirmed ?? 0), 0);
        mail.push({
          userId: p.owner_id, projectId: p.id, linkPath: link(p, "tamu"), type: "rsvp_digest", key: `rsvp_digest:${p.id}:${wib.date}`, inApp: true,
          build: (lang, name) => {
            const id = lang === "id";
            const status = (r: (typeof rsvps)[number]) => r.rsvp_status === "hadir" ? (id ? `Hadir · ${r.pax_confirmed} orang` : `Attending · ${r.pax_confirmed}`) : r.rsvp_status === "tidak_hadir" ? (id ? "Tidak hadir" : "Declined") : (id ? "Masih ragu" : "Maybe");
            return {
              kind: "rsvp_digest", name, couple: p.title, responses: rsvps.length, attending: hadir.length,
              notAttending: rsvps.filter((r) => r.rsvp_status === "tidak_hadir").length, pax,
              recent: rsvps.slice(0, 8).map((r) => ({ name: r.name, status: status(r), attending: r.rsvp_status === "hadir", message: (r as any).rsvp_message ?? null })),
              answered: answered ?? 0, totalGuests: totalGuests ?? 0, url: url(link(p, "tamu")),
            };
          },
        });
      }
    }
  });

  // ----- Trial berakhir: email dengan harga yang berlaku dan promo aktif bila ada -----
  const { data: trials } = await admin.from("licenses").select("id, user_id, ends_at")
    .eq("status", "active").eq("source", "trial").not("ends_at", "is", null)
    .gte("ends_at", new Date(now.getTime() - 3 * 86_400_000).toISOString()).lte("ends_at", now.toISOString());
  // Trial yang emailnya sudah terkirim dilewati sebelum harga, paket, dan hitungan lisensi dibaca (trial berakhir tetap
  // masuk jendela 3 hari, jadi tanpa ini semuanya dibaca ulang di setiap putaran)
  const trialKey = (l: { id: string; user_id: string }) => ({ key: `trial_ended:${l.id}`, userId: l.user_id, inApp: true });
  const trialHave = trials?.length ? await existingKeys(trials.flatMap((l) => keysFor(trialKey(l), true))) : new Set<string>();
  const pendingTrials = (trials ?? []).filter((l) => !keysFor(trialKey(l), true).every((k) => trialHave.has(k)));
  if (pendingTrials.length) {
    const [{ promoEnabled, promos }, { payment }, { data: plans }] = await Promise.all([
      getPricingContext(),
      getSettings(),
      admin.from("plans").select("id, name, price_idr").eq("type", "lifetime").eq("is_active", true).eq("is_public", true).order("tier").order("sort_order").limit(1),
    ]);
    const plan = plans?.[0];
    // Pembayaran di website mati: tombol di email membuka halaman toko, bukan Aktivasi
    const buyUrl = (path: string) => (!payment.enabled && payment.storeUrl ? payment.storeUrl : url(path));
    for (const l of pendingTrials) {
      const { count } = await admin.from("licenses").select("*", { count: "exact", head: true }).eq("user_id", l.user_id).eq("status", "active").is("ends_at", null);
      if (count) continue; // sudah punya akses selamanya
      const { data: proj } = await admin.from("wedding_projects").select("title").eq("owner_id", l.user_id).is("archived_at", null).limit(1).maybeSingle();
      mail.push({
        userId: l.user_id, linkPath: "/aktivasi", type: "trial_ended", key: `trial_ended:${l.id}`, inApp: true,
        build: (lang, name) => {
          if (!plan) return { kind: "trial_ended", name, couple: proj?.title ?? null, plan: "Lifetime Access", price: "-", url: buyUrl("/aktivasi") };
          // Harga tanpa kode (promo otomatis) lalu promo berkode yang sedang berjalan dan lebih murah
          const auto = priceFor(plan, promos, promoEnabled, now.getTime());
          const coded = promos
            .filter((x) => x.code && promoState(x, now.getTime()).state === "live" && !promoExhausted(x))
            .map((x) => ({ x, r: priceFor(plan, [x], promoEnabled, now.getTime(), x.code) }))
            .filter((c) => c.r.promo && c.r.final < auto.final)
            .sort((a, b) => a.r.final - b.r.final)[0];
          const best = coded?.r ?? auto;
          const promo = coded?.x ?? auto.promo;
          const pct = Math.round((best.discount / best.original) * 100);
          return {
            kind: "trial_ended", name, couple: proj?.title ?? null, plan: plan.name, price: formatIDR(best.final),
            original: best.final < best.original ? formatIDR(best.original) : null,
            promo: promo && coded ? { name: promo.name, code: promo.code ?? null, saving: `${formatIDR(best.discount)} (${pct}%)`, until: promo.ends_at ? formatDateCompact(promo.ends_at, WIB, lang) : null } : null,
            url: buyUrl(coded?.x.code ? `/aktivasi?promo=${encodeURIComponent(coded.x.code)}` : "/aktivasi"),
          };
        },
      });
    }
  }

  let created = 0, emailed = 0, failed = 0, pushed = 0;
  const nameOf = (u: Profile) => u.full_name ?? u.email.split("@")[0]!;
  const langOf = (u: Profile): Lang => (u.language === "en" ? "en" : "id");

  // Kandidat yang sudah punya notifikasinya dilewati (lihat existingKeys): putaran berikutnya hari itu tidak menulis apa pun
  const have = await existingKeys([...inApp.flatMap((c) => keysFor(c, false)), ...mail.flatMap((c) => keysFor(c, true))]);
  const inAppTodo = inApp.filter((c) => keysFor(c, false).some((k) => !have.has(k)));
  const mailTodo = mail.filter((c) => keysFor(c, true).some((k) => !have.has(k)));

  // Notifikasi dalam aplikasi (tanpa email)
  await pool(inAppTodo, 5, async (c) => {
    const u = prof.get(c.userId);
    if (!u) return;
    const data = c.build(langOf(u), nameOf(u));
    const r = renderEmail(langOf(u), data, { appUrl: base });
    const res = await admin.from("notifications")
      .upsert({ user_id: c.userId, project_id: c.projectId ?? null, type: c.type, title: r.title, body: r.body, link_path: c.linkPath, channel: "in_app", dedupe_key: `${c.key}:${c.userId}:in_app` }, { onConflict: "dedupe_key", ignoreDuplicates: true })
      .select("id");
    if (res.data?.length) {
      created++;
      // Notifikasi baru juga dikirim ke HP lewat push (tanpa nominal uang)
      pushed += await sendPush(admin, [c.userId], { title: r.title, body: pushBody(data, r.body, langOf(u)), url: c.linkPath, tag: c.key });
    }
  });

  // Email (ringkasan harian, RSVP, trial berakhir)
  await pool(mailTodo, 5, async (c) => {
    const u = prof.get(c.userId);
    if (!u) return;
    const lang = langOf(u);
    const data = c.build(lang, nameOf(u));
    const r = renderEmail(lang, data, { appUrl: base });
    if (c.inApp) {
      const res = await admin.from("notifications")
        .upsert({ user_id: c.userId, project_id: c.projectId ?? null, type: c.type, title: r.title, body: r.body, link_path: c.linkPath, channel: "in_app", dedupe_key: `${c.key}:${c.userId}:in_app` }, { onConflict: "dedupe_key", ignoreDuplicates: true })
        .select("id");
      if (res.data?.length) created++;
    }
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

  return { inApp: inApp.length, emails: mail.length, created, emailed, failed, pushed };
}

// Isi push: sama dengan notifikasi dalam aplikasi, kecuali yang memuat nominal uang
function pushBody(data: EmailData, fallback: string, lang: Lang) {
  if (data.kind === "payment_due") return data.payee;
  if (data.kind === "savings_reminder") return lang === "en" ? "Open Savings to see this month's goal." : "Buka Tabungan untuk melihat target bulan ini.";
  return fallback;
}
