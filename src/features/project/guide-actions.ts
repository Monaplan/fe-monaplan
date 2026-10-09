"use server";

import { revalidatePath } from "next/cache";
import { getProjectContext } from "@/lib/access";
import { dbError, type ActionResult } from "@/lib/result";

export async function setGuideStep(projectId: string, stepKey: string, done: boolean): Promise<ActionResult> {
  const { supabase, session } = await getProjectContext(projectId);
  const { error } = done
    ? await supabase.from("guide_progress").upsert({ project_id: projectId, step_key: stepKey, completed_by: session.user.id })
    : await supabase.from("guide_progress").delete().eq("project_id", projectId).eq("step_key", stepKey);
  revalidatePath("/app/[projectId]", "layout");
  return dbError(error);
}
