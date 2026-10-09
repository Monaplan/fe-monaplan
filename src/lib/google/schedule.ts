import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleConfigured } from "./oauth";
import { syncProject } from "./sync";

// Dipanggil setelah data proyek berubah: sinkronkan ke semua anggota yang menyalakan auto-sync.
// Berjalan setelah respons terkirim, dan tidak pernah membuat aksi penyimpanan gagal.
export function scheduleCalendarSync(projectId: string) {
  if (!googleConfigured()) return;
  try {
    after(async () => {
      try {
        const { data } = await createAdminClient().from("google_calendar_syncs").select("user_id").eq("project_id", projectId).eq("auto_sync", true);
        for (const row of data ?? []) await syncProject(row.user_id, projectId).catch(() => {});
      } catch {
        // tabel belum ada atau jaringan gagal: abaikan
      }
    });
  } catch {
    // dipanggil di luar konteks permintaan
  }
}
