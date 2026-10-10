import type { SupabaseClient } from "@supabase/supabase-js";

// Order pending tanpa satu pun event pembayaran berarti pembeli belum memilih metode bayar,
// jadi aman dianggap ditinggalkan. Order yang sudah punya event dibiarkan agar webhook tetap cocok.

// Saat pembeli membuat order baru, order pending lamanya (harga atau promo berbeda) digantikan
export async function supersedePending(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("orders").select("id, metadata, payment_events(id)").eq("user_id", userId).eq("status", "pending").limit(200);
  const stale = (data ?? []).filter((o: any) => (o.payment_events ?? []).length === 0);
  await Promise.all(stale.map((o: any) => admin.from("orders").update({ status: "cancelled", metadata: { ...(o.metadata ?? {}), superseded: true } }).eq("id", o.id).eq("status", "pending")));
  return stale.length;
}

// Hapus order yang tidak pernah dibayar: pending kedaluwarsa, yang sudah digantikan, dan yang penggunanya sudah dihapus, tanpa event pembayaran
export async function purgeStaleOrders(admin: SupabaseClient) {
  const { data } = await admin.from("orders").select("id, status, user_id, expires_at, metadata, payment_events(id)")
    .in("status", ["pending", "cancelled", "expired"]).is("paid_at", null).order("created_at").limit(1000);
  const now = Date.now();
  const ids = (data ?? [])
    .filter((o: any) => (o.payment_events ?? []).length === 0 && (o.metadata?.superseded === true || o.user_id == null || new Date(o.expires_at).getTime() < now))
    .map((o: any) => o.id as string);
  for (let i = 0; i < ids.length; i += 200) await admin.from("orders").delete().in("id", ids.slice(i, i + 200));
  return ids.length;
}

const ago = (days: number) => new Date(Date.now() - days * 86400_000).toISOString();

// Data berumur yang tidak lagi berguna. Order lunas, audit admin, dan data pernikahan tidak pernah disentuh.
export async function purgeOldRecords(admin: SupabaseClient) {
  const del = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [notifications, attempts, activity, invitations, events] = await Promise.all([
    // Sudah dibaca lebih dari 30 hari, atau jadwalnya lewat lebih dari 90 hari
    del(admin.from("notifications").delete({ count: "exact" }).or(`read_at.lt.${ago(30)},scheduled_for.lt.${ago(90)}`)),
    del(admin.from("access_code_attempts").delete({ count: "exact" }).lt("attempted_at", ago(14))),
    del(admin.from("activity_logs").delete({ count: "exact" }).lt("created_at", ago(180))),
    del(admin.from("project_invitations").delete({ count: "exact" }).neq("status", "accepted").lt("expires_at", ago(30))),
    // Event pembayaran yatim (ordernya sudah dihapus)
    del(admin.from("payment_events").delete({ count: "exact" }).is("order_id", null).lt("received_at", ago(30))),
  ]);
  return { notifications, attempts, activity, invitations, events };
}

// Berkas di R2 yang tidak dirujuk satu pun baris database dan sudah lebih dari 24 jam (unggahan yang tidak jadi disimpan,
// atau sisa proyek yang sudah dihapus). Bila salah satu pembacaan database gagal, tidak ada yang dianggap yatim.
export async function findOrphanFiles(admin: SupabaseClient) {
  const refs = new Set<string>();
  const sources: [string, string][] = [["wedding_projects", "cover_image_path"], ["documents", "storage_path"], ["gift_items", "image_path"], ["inspiration_items", "image_path"]];
  for (const [table, col] of sources) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from(table).select(col).not(col, "is", null).range(from, from + 999);
      if (error) throw new Error(`Gagal membaca ${table}: ${error.message}`);
      for (const r of (data ?? []) as any[]) refs.add(r[col]);
      if ((data ?? []).length < 1000) break;
    }
  }
  const { listAllObjects } = await import("@/lib/storage");
  const cutoff = Date.now() - 24 * 3600_000;
  const standard = /^[^/]+\/(documents|gifts|cover|inspiration)\//;
  const orphans = (await listAllObjects()).filter((o) => standard.test(o.key) && !refs.has(o.key) && o.modified < cutoff);
  return { orphans, bytes: orphans.reduce((a, o) => a + o.size, 0) };
}
