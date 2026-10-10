import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GUIDE_STEPS } from "@/content/panduan";
import type { Project } from "./access";

export type GuideInput = {
  events: number; allocated: number; tasksDone: number; vendors: number; guests: number;
  templates: { created_at: string; updated_at: string }[]; sent: number; rundown: number; docAll: number; docDone: number; manual: string[];
};

// Hanya perhitungan: halaman yang sudah memegang datanya (dashboard) tidak perlu mengulang belasan query hitungan
export function guideFrom(project: Project, d: GuideInput) {
  const auto: Record<string, boolean> = {
    atur_pernikahan: !!project.wedding_date && d.events > 0,
    tentukan_budget: project.total_budget_idr > 0 && d.allocated > 0,
    rapikan_checklist: d.tasksDone > 0,
    catat_vendor: d.vendors > 0,
    daftar_tamu: d.guests > 0,
    template_whatsapp: d.templates.some((t) => Date.parse(t.updated_at) - Date.parse(t.created_at) > 1000) || d.sent > 0,
    susun_rundown: d.rundown > 0,
    lengkapi_dokumen: d.docAll > 0 && d.docAll === d.docDone,
  };
  const manualKeys = new Set(d.manual);
  const steps = GUIDE_STEPS.map((s) => ({ ...s, done: auto[s.key] || manualKeys.has(s.key), manual: manualKeys.has(s.key) && !auto[s.key] }));
  return { steps, done: steps.filter((s) => s.done).length, total: steps.length };
}

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
  return guideFrom(project, {
    events: events.count ?? 0, allocated: allocated.count ?? 0, tasksDone: tasksDone.count ?? 0, vendors: vendors.count ?? 0, guests: guests.count ?? 0,
    templates: tpl.data ?? [], sent: sent.count ?? 0, rundown: rundown.count ?? 0, docAll: docAll.count ?? 0, docDone: docDone.count ?? 0,
    manual: (manual.data ?? []).map((m) => m.step_key as string),
  });
}
