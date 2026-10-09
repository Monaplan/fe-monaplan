import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/constants";
import { decryptToken } from "./crypto";
import { GoogleAuthError, refreshAccessToken } from "./oauth";
import { calendarExists, createCalendar, deleteEvent, upsertEvent } from "./api";
import { buildDesiredEvents, planSync, type SourceKind } from "./events";

export type SyncResult =
  | { ok: true; created: number; updated: number; removed: number; unchanged: number; failed: number; message: string }
  | { ok: false; error: string };

const CONCURRENCY = 5;

async function pool<T>(items: T[], worker: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (i < items.length) await worker(items[i++]!);
  }));
}

// Sinkronkan satu proyek ke Google Calendar milik satu pengguna (satu arah: Monaplan → Google)
export async function syncProject(userId: string, projectId: string): Promise<SyncResult> {
  const admin = createAdminClient();
  const record = (patch: Record<string, unknown>) =>
    admin.from("google_calendar_syncs").update(patch).eq("user_id", userId).eq("project_id", projectId);
  const stop = async (error: string): Promise<SyncResult> => {
    await record({ last_status: "error", last_message: error, last_synced_at: new Date().toISOString() });
    return { ok: false, error };
  };

  const [{ data: link }, { data: sync }, { data: member }] = await Promise.all([
    admin.from("google_calendar_links").select("refresh_token_enc").eq("user_id", userId).maybeSingle(),
    admin.from("google_calendar_syncs").select("calendar_id").eq("user_id", userId).eq("project_id", projectId).maybeSingle(),
    admin.from("project_members").select("user_id").eq("user_id", userId).eq("project_id", projectId).maybeSingle(),
  ]);
  if (!link) return { ok: false, error: "Google Calendar belum tersambung." };
  if (!sync) return { ok: false, error: "Sinkronisasi proyek ini belum diaktifkan." };
  if (!member) {
    await admin.from("google_calendar_syncs").delete().eq("user_id", userId).eq("project_id", projectId);
    return { ok: false, error: "Kamu bukan lagi anggota proyek ini." };
  }

  let token: string;
  try {
    token = await refreshAccessToken(decryptToken(link.refresh_token_enc));
  } catch (e) {
    if (e instanceof GoogleAuthError && e.revoked) {
      await admin.from("google_calendar_links").delete().eq("user_id", userId);
      return { ok: false, error: "Izin ke Google dicabut. Sambungkan ulang Google Calendar." };
    }
    return stop(`Gagal masuk ke Google: ${(e as Error).message}`);
  }

  try {
    const { data: project } = await admin.from("wedding_projects").select("title, timezone").eq("id", projectId).single();
    if (!project) return stop("Proyek tidak ditemukan.");

    // Kalender sekunder "Monaplan"; dibuat ulang bila pengguna menghapusnya di Google
    let calendarId = sync.calendar_id as string | null;
    if (calendarId && !(await calendarExists(token, calendarId))) {
      calendarId = null;
      await admin.from("google_event_links").delete().eq("user_id", userId).eq("project_id", projectId);
    }
    if (!calendarId) {
      calendarId = await createCalendar(token, `Monaplan · ${project.title}`.slice(0, 100), project.timezone, "Dikelola otomatis oleh Monaplan. Ubah jadwal dari aplikasi Monaplan.");
      await record({ calendar_id: calendarId });
    }

    const [tasks, payments, events, agenda, links] = await Promise.all([
      admin.from("tasks").select("id, title, description, category, priority, due_date").eq("project_id", projectId).not("due_date", "is", null).neq("status", "done").limit(3000),
      admin.from("expense_payments").select("id, label, kind, amount_idr, due_date, notes").eq("project_id", projectId).not("due_date", "is", null).eq("status", "belum_bayar").limit(3000),
      admin.from("wedding_events").select("id, name, type, starts_at, ends_at, venue_name, venue_address, maps_url, dress_code, notes").eq("project_id", projectId).not("starts_at", "is", null).limit(200),
      admin.from("agenda_items").select("id, title, description, location, starts_at, ends_at, all_day, remind_offsets_minutes").eq("project_id", projectId).limit(3000),
      admin.from("google_event_links").select("source, source_id, google_event_id, fingerprint").eq("user_id", userId).eq("project_id", projectId).limit(10000),
    ]);
    const failedRead = [tasks, payments, events, agenda, links].find((r) => r.error);
    if (failedRead?.error) return stop(`Gagal membaca data proyek: ${failedRead.error.message}`);

    const desired = buildDesiredEvents(
      { tasks: (tasks.data ?? []) as any, payments: (payments.data ?? []).map((p) => ({ ...p, amount_idr: Number(p.amount_idr) })) as any, events: (events.data ?? []) as any, agenda: (agenda.data ?? []) as any },
      { projectId, tz: project.timezone, appUrl: appUrl() },
    ).map((d) => ({ ...d, fingerprint: createHash("sha256").update(JSON.stringify([calendarId, d.body])).digest("hex").slice(0, 32) }));

    const existing = new Map((links.data ?? []).map((l) => [`${l.source}:${l.source_id}`, { fingerprint: l.fingerprint as string, eventId: l.google_event_id as string }]));
    const plan = planSync(desired, existing);

    let failed = 0;
    let firstError = "";
    const done: { source: SourceKind; sourceId: string; eventId: string; fingerprint: string }[] = [];
    const run = (items: typeof desired, known: boolean) =>
      pool(items, async (d) => {
        try {
          await upsertEvent(token, calendarId!, d.eventId, d.body, known);
          done.push({ source: d.source, sourceId: d.sourceId, eventId: d.eventId, fingerprint: d.fingerprint });
        } catch (e) {
          failed++;
          firstError ||= (e as Error).message;
        }
      });
    await run(plan.create as typeof desired, false);
    await run(plan.update as typeof desired, true);

    const removed: string[] = [];
    await pool(plan.remove, async (key) => {
      try {
        await deleteEvent(token, calendarId!, existing.get(key)!.eventId);
        removed.push(key);
      } catch (e) {
        failed++;
        firstError ||= (e as Error).message;
      }
    });

    if (done.length) {
      await admin.from("google_event_links").upsert(
        done.map((d) => ({ user_id: userId, project_id: projectId, source: d.source, source_id: d.sourceId, google_event_id: d.eventId, fingerprint: d.fingerprint })),
        { onConflict: "user_id,project_id,source,source_id" },
      );
    }
    for (const key of removed) {
      const [source, sourceId] = key.split(":");
      await admin.from("google_event_links").delete().eq("user_id", userId).eq("project_id", projectId).eq("source", source!).eq("source_id", sourceId!);
    }

    const message = `${plan.create.length} baru, ${plan.update.length} diperbarui, ${removed.length} dihapus` + (failed ? `, ${failed} gagal (${firstError})` : "");
    await record({ last_status: failed ? "error" : "ok", last_message: message, last_synced_at: new Date().toISOString() });
    return { ok: true, created: plan.create.length, updated: plan.update.length, removed: removed.length, unchanged: plan.unchanged, failed, message };
  } catch (e) {
    return stop(`Sinkronisasi gagal: ${(e as Error).message}`);
  }
}
