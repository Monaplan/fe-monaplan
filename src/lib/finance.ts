// Pencatatan keuangan Monaplan. Fungsi murni (tanpa akses database) supaya mudah diuji.
// Pemasukan = pesanan website (Midtrans, tabel orders) + penjualan manual (tabel sales); pengeluaran = tabel expenses.

export const CHANNELS = ["lynk", "whatsapp", "offline", "lainnya"] as const;
export type Channel = (typeof CHANNELS)[number];
// "website" dipakai untuk pesanan Midtrans; bukan pilihan di formulir pembeli
export type Source = Channel | "website";
export const CHANNEL_LABEL: Record<Source, string> = { website: "Website (Midtrans)", lynk: "Lynk.id", whatsapp: "WhatsApp", offline: "Offline", lainnya: "Lainnya" };

export const EXPENSE_CATEGORIES = ["hosting", "iklan", "biaya_platform", "operasional", "lainnya"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export const EXPENSE_LABEL: Record<ExpenseCategory, string> = { hosting: "Hosting & server", iklan: "Iklan", biaya_platform: "Biaya platform", operasional: "Operasional", lainnya: "Lainnya" };

export type OrderRow = { id: string; order_number: string; amount_idr: number | string; paid_at: string; payment_method?: string | null; plans?: { name: string } | null; profiles?: { email: string } | null };
export type SaleRow = { id: string; sold_on: string; buyer_name: string; channel: string; gross_idr: number | string; fee_idr: number | string; status: string; reference?: string | null; plans?: { name: string } | null };
export type ExpenseRow = { id: string; spent_on: string; category: string; description: string; amount_idr: number | string };

export type LedgerRow = {
  id: string;
  date: string; // YYYY-MM-DD (WIB)
  kind: "income" | "expense";
  source: string; // saluran untuk pemasukan, kategori untuk pengeluaran
  title: string;
  sub: string | null;
  reference: string | null;
  gross: number; // pemasukan: yang dibayar pembeli; pengeluaran: jumlah keluar
  fee: number;
  net: number; // pemasukan: gross - fee; pengeluaran: gross
  href: string | null;
};

const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;
const WIB_MS = 7 * 3_600_000;

// Bulan berformat YYYY-MM
export const isMonthKey = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

export function monthKeyOf(date: Date | number): string {
  const d = new Date(typeof date === "number" ? date : date.getTime());
  const w = new Date(d.getTime() + WIB_MS); // geser ke WIB lalu baca komponen UTC
  return `${w.getUTCFullYear()}-${String(w.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Batas satu bulan: tanggal (untuk kolom date) dan waktu ISO WIB (untuk kolom timestamptz). `to` tidak termasuk.
export function monthRange(key: string) {
  const next = shiftMonth(key, 1);
  return { fromDate: `${key}-01`, toDate: `${next}-01`, fromIso: new Date(`${key}-01T00:00:00+07:00`).toISOString(), toIso: new Date(`${next}-01T00:00:00+07:00`).toISOString() };
}

// Tanggal (WIB) dari waktu ISO
export function wibDate(iso: string): string {
  const w = new Date(Date.parse(iso) + WIB_MS);
  return `${w.getUTCFullYear()}-${String(w.getUTCMonth() + 1).padStart(2, "0")}-${String(w.getUTCDate()).padStart(2, "0")}`;
}

// Gabungkan semua pencatatan menjadi satu buku kas, terbaru di atas. Penjualan yang di-refund tidak dihitung sebagai pemasukan.
export function buildLedger({ orders = [], sales = [], expenses = [] }: { orders?: OrderRow[]; sales?: SaleRow[]; expenses?: ExpenseRow[] }): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const o of orders) {
    const gross = num(o.amount_idr);
    rows.push({ id: `o:${o.id}`, date: wibDate(o.paid_at), kind: "income", source: "website", title: o.profiles?.email ?? o.order_number, sub: [o.plans?.name, o.payment_method].filter(Boolean).join(" · ") || null, reference: o.order_number, gross, fee: 0, net: gross, href: "/admin/order" });
  }
  for (const s of sales) {
    if (s.status !== "paid") continue;
    const gross = num(s.gross_idr), fee = num(s.fee_idr);
    rows.push({ id: `s:${s.id}`, date: s.sold_on, kind: "income", source: s.channel, title: s.buyer_name, sub: s.plans?.name ?? null, reference: s.reference ?? null, gross, fee, net: gross - fee, href: "/admin/pembeli" });
  }
  for (const e of expenses) {
    const gross = num(e.amount_idr);
    rows.push({ id: `e:${e.id}`, date: e.spent_on, kind: "expense", source: e.category, title: e.description, sub: null, reference: null, gross, fee: 0, net: gross, href: null });
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));
}

export type Summary = { count: number; gross: number; fees: number; expenses: number; profit: number; bySource: { source: string; count: number; gross: number; fee: number }[] };

export function summarize(rows: LedgerRow[]): Summary {
  let gross = 0, fees = 0, expenses = 0, count = 0;
  const by = new Map<string, { source: string; count: number; gross: number; fee: number }>();
  for (const r of rows) {
    if (r.kind === "expense") { expenses += r.gross; continue; }
    count++; gross += r.gross; fees += r.fee;
    const b = by.get(r.source) ?? { source: r.source, count: 0, gross: 0, fee: 0 };
    b.count++; b.gross += r.gross; b.fee += r.fee;
    by.set(r.source, b);
  }
  return { count, gross, fees, expenses, profit: gross - fees - expenses, bySource: [...by.values()].sort((a, b) => b.gross - a.gross) };
}

// Selisih persen terhadap pembanding; null bila pembanding nol
export const deltaPct = (now: number, prev: number) => (prev > 0 ? Math.round(((now - prev) / prev) * 100) : null);

// Sel CSV: kutip bila memuat koma, kutip, atau baris baru; awalan rumus (= + - @) dinetralkan agar tidak dieksekusi spreadsheet
export function csvCell(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ledgerCsv(rows: LedgerRow[], label: (kind: LedgerRow["kind"], source: string) => { kind: string; source: string }): string {
  const head = ["Tanggal", "Jenis", "Saluran/Kategori", "Uraian", "Referensi", "Kotor", "Biaya", "Bersih"];
  const lines = rows.map((r) => {
    const l = label(r.kind, r.source);
    return [r.date, l.kind, l.source, r.sub ? `${r.title} (${r.sub})` : r.title, r.reference ?? "", r.kind === "expense" ? -r.gross : r.gross, r.fee, r.kind === "expense" ? -r.net : r.net].map(csvCell).join(",");
  });
  return "﻿" + [head.join(","), ...lines].join("\r\n");
}

// Pesan WhatsApp ke pembeli berisi kode akses dan cara aktivasi
export function buyerMessage({ name, code, appUrl }: { name: string; code: string; appUrl: string }): string {
  return `Halo ${name}, terima kasih sudah membeli Monaplan.\n\nKode akses kamu:\n${code}\n\nCara aktivasi:\n1. Buka ${appUrl}/aktivasi lalu daftar atau masuk\n2. Masukkan kode di atas\n3. Akunmu langsung aktif\n\nButuh bantuan? Balas pesan ini ya.`;
}
