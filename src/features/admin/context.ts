import "server-only";
import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

// Konteks umum aksi admin: pastikan pemanggil admin, siapkan klien secret key dan pencatat log audit
export async function adminContext() {
  const { user } = await requireAdmin();
  const admin = createAdminClient();
  const audit = (action: string, targetType: string, targetId: string | null, metadata: Record<string, unknown> = {}) =>
    admin.from("admin_audit_logs").insert({ admin_id: user.id, action, target_type: targetType, target_id: targetId, metadata });
  return { admin, audit, adminId: user.id };
}
