import { NextResponse } from "next/server";
import { getSession } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHANNEL_LABEL, EXPENSE_LABEL, isMonthKey, ledgerCsv, monthKeyOf, monthRange, type ExpenseCategory, type Source } from "@/lib/finance";
import { loadLedger } from "@/lib/finance-data";

// Ekspor buku kas satu bulan (?bulan=YYYY-MM) untuk dibuka di Excel atau Google Sheets
export async function GET(req: Request) {
  const session = await getSession();
  if (session?.profile?.role !== "admin") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const param = new URL(req.url).searchParams.get("bulan");
  const bulan = isMonthKey(param) ? param : monthKeyOf(Date.now());
  const range = monthRange(bulan);
  const admin = createAdminClient();
  const { rows } = await loadLedger(admin, bulan, bulan);
  const inMonth = rows.filter((r) => r.date >= range.fromDate && r.date < range.toDate);
  await admin.from("admin_audit_logs").insert({ admin_id: session.user.id, action: "finance.export", target_type: "finance", target_id: null, metadata: { bulan, rows: inMonth.length } });

  const body = ledgerCsv(inMonth, (kind, source) => ({
    kind: kind === "income" ? "Pemasukan" : "Pengeluaran",
    source: kind === "income" ? (CHANNEL_LABEL[source as Source] ?? source) : (EXPENSE_LABEL[source as ExpenseCategory] ?? source),
  }));
  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="keuangan-${bulan}.csv"`, "Cache-Control": "no-store" },
  });
}
