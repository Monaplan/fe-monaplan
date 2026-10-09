import { NextResponse } from "next/server";
import { getSession } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const session = await getSession();
  if (session?.profile?.role !== "admin") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { batchId } = await params;
  const admin = createAdminClient();
  const { data: batch } = await admin.from("access_code_batches").select("name").eq("id", batchId).single();
  const { data: codes } = await admin.from("access_codes").select("code, status, redemption_count, max_redemptions, valid_until").eq("batch_id", batchId).order("created_at").limit(10000);
  await admin.from("admin_audit_logs").insert({ admin_id: session.user.id, action: "batch.export", target_type: "access_code_batch", target_id: batchId });

  const body = "﻿Kode,Status,Terpakai,Kuota,Berlaku Sampai\r\n" +
    (codes ?? []).map((c) => [c.code, c.status, c.redemption_count, c.max_redemptions, c.valid_until ?? ""].join(",")).join("\r\n");
  const slug = (batch?.name ?? "batch").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kode-${slug}.csv"` },
  });
}
