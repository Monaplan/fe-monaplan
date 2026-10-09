import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { TrialClient } from "./trial-client";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Trial") };
}

export default async function TrialPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const settings = await getSettings();
  // Bila migrasi belum dijalankan, kolom enum 'trial' belum ada dan query ini gagal: tampilkan nol
  const { data } = await admin.from("licenses").select("status, starts_at, ends_at").eq("source", "trial");
  const rows = data ?? [];
  const now = Date.now();
  const stats = {
    total: rows.length,
    active: rows.filter((l) => l.status === "active" && Date.parse(l.starts_at) <= now && (!l.ends_at || Date.parse(l.ends_at) > now)).length,
  };
  const { error } = await admin.from("app_settings").select("key").limit(1);
  return <TrialClient enabled={settings.trial.enabled} days={settings.trial.days} stats={stats} migrated={!error} />;
}
