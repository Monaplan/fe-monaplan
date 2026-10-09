import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GUIDE_STEPS } from "@/content/panduan";
import type { Project } from "./access";

export async function getGuideStatus(supabase: SupabaseClient, project: Project) {
  const pid = project.id;
  const head = { count: "exact" as const, head: true };
  const [events, allocated, tasksDone, vendors, guests, tpl, sent, rundown, docAll, docDone, manual] = await Promise.all([
    supabase.from("wedding_events").select("*", head).eq("project_id", pid),
    supabase.from("budget_categories").select("*", head).eq("project_id", pid).gt("allocated_idr", 0),
    supabase.from("tasks").select("*", head).eq("project_id", pid).eq("status", "done"),
    supabase.from("vendors").select("*", head).eq("project_id", pid),
    supabase.from("guests").select("*", head).eq("project_id", pid),
    supabase.from("message_templates").select("created_at, updated_at").eq("project_id", pid),
    supabase.from("guests").select("*", head).eq("project_id", pid).not("invitation_sent_at", "is", null),
    supabase.from("rundown_items").select("*", head).eq("project_id", pid),
    supabase.from("document_checklist_items").select("*", head).eq("project_id", pid),
    supabase.from("document_checklist_items").select("*", head).eq("project_id", pid).eq("is_done", true),
    supabase.from("guide_progress").select("step_key").eq("project_id", pid),
  ]);

  const auto: Record<string, boolean> = {
    atur_pernikahan: !!project.wedding_date && (events.count ?? 0) > 0,
    tentukan_budget: project.total_budget_idr > 0 && (allocated.count ?? 0) > 0,
    rapikan_checklist: (tasksDone.count ?? 0) > 0,
    catat_vendor: (vendors.count ?? 0) > 0,
    daftar_tamu: (guests.count ?? 0) > 0,
    template_whatsapp: (tpl.data ?? []).some((t) => Date.parse(t.updated_at) - Date.parse(t.created_at) > 1000) || (sent.count ?? 0) > 0,
    susun_rundown: (rundown.count ?? 0) > 0,
    lengkapi_dokumen: (docAll.count ?? 0) > 0 && docAll.count === docDone.count,
  };
  const manualKeys = new Set((manual.data ?? []).map((m) => m.step_key));
  const steps = GUIDE_STEPS.map((s) => ({ ...s, done: auto[s.key] || manualKeys.has(s.key), manual: manualKeys.has(s.key) && !auto[s.key] }));
  return { steps, done: steps.filter((s) => s.done).length, total: steps.length };
}
