// Perhitungan budget yang murni (tanpa I/O): pembagian biaya per pihak dan target tabungan. Diuji di scripts/test-lib.mjs.

export type Side = "pria" | "wanita" | "bersama";
type ItemLite = { id: string; estimated_idr: number; actual_idr: number | null; funded_by?: Side | null };
type PaymentLite = { budget_item_id: string | null; amount_idr: number; status: string };

export type SideTotals = { plan: number; paid: number; remaining: number };

const planOf = (i: ItemLite) => i.actual_idr ?? i.estimated_idr;

// Bagi satu nominal sesuai persen pihak pria; sisa pembulatan masuk ke pihak wanita agar jumlahnya selalu utuh
function share(amount: number, priaPct: number): [number, number] {
  const pria = Math.round((amount * priaPct) / 100);
  return [pria, amount - pria];
}

export function fundingSplit(items: ItemLite[], payments: PaymentLite[], priaPct: number) {
  const pct = Math.min(100, Math.max(0, Math.round(priaPct)));
  const known = new Set(items.map((i) => i.id));
  const paidByItem = new Map<string, number>();
  let looseShared = 0; // pembayaran lunas tanpa item budget: dihitung bersama
  for (const p of payments) {
    if (p.status !== "sudah_bayar") continue;
    if (p.budget_item_id && known.has(p.budget_item_id)) paidByItem.set(p.budget_item_id, (paidByItem.get(p.budget_item_id) ?? 0) + p.amount_idr);
    else looseShared += p.amount_idr;
  }

  const pria = { plan: 0, paid: 0 }, wanita = { plan: 0, paid: 0 };
  let sharedPlan = 0;
  for (const i of items) {
    const plan = planOf(i), paid = paidByItem.get(i.id) ?? 0;
    const side = i.funded_by ?? "bersama";
    if (side === "pria") { pria.plan += plan; pria.paid += paid; }
    else if (side === "wanita") { wanita.plan += plan; wanita.paid += paid; }
    else {
      sharedPlan += plan;
      const [pp, pw] = share(plan, pct), [qp, qw] = share(paid, pct);
      pria.plan += pp; wanita.plan += pw; pria.paid += qp; wanita.paid += qw;
    }
  }
  const [lp, lw] = share(looseShared, pct);
  pria.paid += lp; wanita.paid += lw;

  const done = (s: { plan: number; paid: number }): SideTotals => ({ ...s, remaining: Math.max(0, s.plan - s.paid) });
  return { pria: done(pria), wanita: done(wanita), sharedPlan, sharedPaid: looseShared, pct };
}

// Target tabungan per bulan. Tanpa pengaturan: jumlah = sisa tagihan vendor, batas waktu = 14 hari sebelum hari H, dibulatkan ke atas per Rp1.000.
// targetOverride (jumlah) dan deadlineOverride (tanggal) diisi pengguna; kosong berarti otomatis.
export const SAVINGS_BUFFER_DAYS = 14;

export function savingsPlan({ items, payments, savings, weddingDate, today, targetOverride, deadlineOverride }: {
  items: ItemLite[]; payments: PaymentLite[]; savings: number; weddingDate: string | null; today: string;
  targetOverride?: number | null; deadlineOverride?: string | null;
}) {
  const projected = items.reduce((s, i) => s + planOf(i), 0);
  const paid = payments.filter((p) => p.status === "sudah_bayar").reduce((s, p) => s + p.amount_idr, 0);
  const autoNeed = Math.max(0, projected - paid);
  const manualTarget = targetOverride != null && targetOverride > 0;
  const need = manualTarget ? targetOverride! : autoNeed;
  const shortfall = Math.max(0, need - Math.max(0, savings));
  const manualDeadline = !!deadlineOverride && /^\d{4}-\d{2}-\d{2}$/.test(deadlineOverride);
  const base = { need, autoNeed, shortfall, savings, manualTarget, manualDeadline };
  const deadline = manualDeadline ? deadlineOverride! : weddingDate ? addDays(weddingDate, -SAVINGS_BUFFER_DAYS) : null;
  if (!deadline) return { ...base, months: null, perMonth: null, deadline: null };

  const days = Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  // Sisa bulan (minimal 1): bila batas sudah lewat, seluruh kekurangan menjadi target bulan ini
  const months = Math.max(1, Math.ceil(days / 30.44));
  const perMonth = shortfall ? Math.ceil(shortfall / months / 1000) * 1000 : 0;
  return { ...base, months, perMonth, deadline };
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Riwayat setoran: total, dan jumlah per bulan (YYYY-MM) tanpa celah, dari bulan setoran pertama sampai bulan ini
type DepositLite = { amount_idr: number; deposited_on: string };
export const depositTotal = (deposits: DepositLite[]) => deposits.reduce((s, d) => s + d.amount_idr, 0);

export function depositsByMonth(deposits: DepositLite[], today: string): { month: string; total: number }[] {
  if (!deposits.length) return [];
  const sums = new Map<string, number>();
  for (const d of deposits) { const m = d.deposited_on.slice(0, 7); sums.set(m, (sums.get(m) ?? 0) + d.amount_idr); }
  const first = [...sums.keys()].sort()[0]!;
  const last = [today.slice(0, 7), ...sums.keys()].sort().pop()!;
  const out: { month: string; total: number }[] = [];
  let [y, m] = first.split("-").map(Number) as [number, number];
  for (;;) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push({ month: key, total: sums.get(key) ?? 0 });
    if (key >= last) break;
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}

