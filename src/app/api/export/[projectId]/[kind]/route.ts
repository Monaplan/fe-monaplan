import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GUEST_CATEGORY, PARTY_SIDE, PAYMENT_KIND, PHASE_LABEL, PURCHASE_STATUS, RSVP_STATUS, TASK_STATUS, VENDOR_STATUS, labelOf } from "@/lib/constants";

function csv(rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string; kind: string }> }) {
  const { projectId, kind } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("wedding_projects").select("title").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let rows: (string | number | null | undefined)[][] = [];
  switch (kind) {
    case "tamu": {
      const { data } = await supabase.from("guests").select("*, guest_groups(name)").eq("project_id", projectId).order("name");
      rows = [["Nama", "WhatsApp", "Pihak", "Grup", "Kategori", "Kuota Pax", "Status RSVP", "Pax Hadir", "Ucapan", "Undangan Dikirim", "Catatan"],
        ...(data ?? []).map((g: any) => [g.name, g.phone_e164, labelOf(PARTY_SIDE, g.side), g.guest_groups?.name, labelOf(GUEST_CATEGORY, g.category), g.pax_invited,
          labelOf(RSVP_STATUS, g.rsvp_status), g.pax_confirmed, g.rsvp_message, g.invitation_sent_at ? "Ya" : "Belum", g.notes])];
      break;
    }
    case "budget": {
      const [{ data: items }, { data: pays }] = await Promise.all([
        supabase.from("budget_items").select("*, budget_categories(name), vendors(name)").eq("project_id", projectId),
        supabase.from("expense_payments").select("*, vendors(name), budget_items(name)").eq("project_id", projectId).order("due_date"),
      ]);
      rows = [["ITEM BUDGET"], ["Kategori", "Item", "Vendor", "Estimasi", "Realisasi", "Catatan"],
        ...(items ?? []).map((i: any) => [i.budget_categories?.name, i.name, i.vendors?.name, i.estimated_idr, i.actual_idr, i.notes]),
        [], ["JADWAL PEMBAYARAN"], ["Label", "Jenis", "Item", "Vendor", "Nominal", "Jatuh Tempo", "Status", "Tanggal Bayar", "Metode"],
        ...(pays ?? []).map((p: any) => [p.label, labelOf(PAYMENT_KIND, p.kind), p.budget_items?.name, p.vendors?.name, p.amount_idr, p.due_date,
          p.status === "sudah_bayar" ? "Lunas" : "Belum dibayar", p.paid_at, p.payment_method])];
      break;
    }
    case "checklist": {
      const { data } = await supabase.from("tasks").select("*").eq("project_id", projectId).order("due_date");
      rows = [["Judul", "Fase", "Kategori", "Due Date", "Prioritas", "Status", "Deskripsi"],
        ...(data ?? []).map((t: any) => [t.title, PHASE_LABEL[t.phase_key], t.category, t.due_date, t.priority, labelOf(TASK_STATUS, t.status), t.description])];
      break;
    }
    case "vendor": {
      const { data } = await supabase.from("vendors").select("*").eq("project_id", projectId).order("category");
      rows = [["Kategori", "Nama", "Kontak", "WhatsApp", "Email", "Instagram", "Status", "Nilai Deal", "Tanggal Deal", "Catatan"],
        ...(data ?? []).map((v: any) => [v.category, v.name, v.contact_person, v.phone_e164, v.email, v.instagram, labelOf(VENDOR_STATUS, v.status), v.deal_amount_idr, v.deal_date, v.notes])];
      break;
    }
    case "rundown": {
      const { data } = await supabase.from("rundown_items").select("*, wedding_events(name), vendors(name)").eq("project_id", projectId).order("start_time");
      rows = [["Acara", "Mulai", "Selesai", "Kegiatan", "PIC", "Lokasi", "Vendor", "Deskripsi"],
        ...(data ?? []).map((r: any) => [r.wedding_events?.name, r.start_time?.slice(0, 5), r.end_time?.slice(0, 5), r.title, r.pic_name, r.location, r.vendors?.name, r.description])];
      break;
    }
    case "mahar": {
      const { data } = await supabase.from("gift_items").select("*").eq("project_id", projectId).order("type");
      rows = [["Jenis", "Nama", "Kategori", "Jumlah", "Estimasi", "Harga Beli", "Toko", "Link", "Status"],
        ...(data ?? []).map((g: any) => [g.type, g.name, g.category, g.quantity, g.estimated_price_idr, g.actual_price_idr, g.store_name, g.purchase_url, labelOf(PURCHASE_STATUS, g.status)])];
      break;
    }
    default:
      return NextResponse.json({ error: "UNKNOWN_KIND" }, { status: 400 });
  }

  const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="monaplan-${slug}-${kind}.csv"`,
    },
  });
}
