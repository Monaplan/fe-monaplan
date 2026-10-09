import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleConfigured } from "./oauth";

export type GoogleStatus = {
  configured: boolean;
  linked: { email: string | null; connectedAt: string } | null;
  sync: { autoSync: boolean; lastSyncedAt: string | null; lastStatus: string | null; lastMessage: string | null } | null;
};

// Status sambungan Google Calendar milik satu pengguna untuk satu proyek
export async function getGoogleStatus(userId: string, projectId: string): Promise<GoogleStatus> {
  const configured = googleConfigured();
  if (!configured) return { configured, linked: null, sync: null };
  try {
    const admin = createAdminClient();
    const [{ data: link }, { data: sync }] = await Promise.all([
      admin.from("google_calendar_links").select("google_email, connected_at").eq("user_id", userId).maybeSingle(),
      admin.from("google_calendar_syncs").select("auto_sync, last_synced_at, last_status, last_message").eq("user_id", userId).eq("project_id", projectId).maybeSingle(),
    ]);
    return {
      configured,
      linked: link ? { email: link.google_email, connectedAt: link.connected_at } : null,
      sync: sync ? { autoSync: sync.auto_sync, lastSyncedAt: sync.last_synced_at, lastStatus: sync.last_status, lastMessage: sync.last_message } : null,
    };
  } catch {
    return { configured, linked: null, sync: null };
  }
}
