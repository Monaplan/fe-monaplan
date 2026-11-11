"use client";

import { useMemo, useState } from "react";
import { Copy, KeyRound, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { DateField } from "@/components/ui/date-field";
import { Modal } from "@/components/ui/modal";
import { ActionButton, ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { StatusPill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { createSale, deleteSale, issueSaleCode, refundSale, updateSale } from "@/features/admin/sales-actions";
import { CHANNELS, CHANNEL_LABEL, buyerMessage, type Source } from "@/lib/finance";
import { formatDateCompact, formatIDR } from "@/lib/format";
import { whatsappLink } from "@/lib/support";
import { useI18n } from "@/i18n/client";

export type SaleItem = {
  id: string; sold_on: string; buyer_name: string; buyer_email: string | null; buyer_phone: string | null;
  channel: string; plan_id: string | null; plan_name: string | null; gross_idr: number; fee_idr: number; status: string;
  reference: string | null; notes: string | null;
  code: string | null; code_status: "available" | "redeemed" | "revoked" | null; redeemer: string | null; redeemed_at: string | null;
};
type PlanOpt = { id: string; name: string; price_idr: number };
type Issued = { code: string; name: string; phone: string | null };

const todayWib = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

export function BuyersClient({ sales, plans, appUrl, disabled }: { sales: SaleItem[]; plans: PlanOpt[]; appUrl: string; disabled: boolean }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");
  const [state, setState] = useState("");
  const [form, setForm] = useState<{ open: boolean; sale: SaleItem | null }>({ open: false, sale: null });
  const [issued, setIssued] = useState<Issued | null>(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sales.filter((s) => {
      if (channel && s.channel !== channel) return false;
      if (state === "paid" && s.status !== "paid") return false;
      if (state === "refunded" && s.status !== "refunded") return false;
      if (state === "waiting" && !(s.status === "paid" && s.code_status === "available")) return false;
      if (state === "nocode" && !(s.status === "paid" && !s.code)) return false;
      return !needle || [s.buyer_name, s.buyer_email, s.buyer_phone, s.reference, s.code].some((x) => x?.toLowerCase().includes(needle));
    });
  }, [sales, q, channel, state]);

  const copy = (code: string) => { try { navigator.clipboard.writeText(code); toast(t("Kode disalin.")); } catch { toast(code); } };
  const waFor = (name: string, phone: string | null, code: string) => (phone ? whatsappLink(phone, buyerMessage({ name, code, appUrl })) : null);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Cari nama, email, nomor, atau kode")} aria-label={t("Cari pembeli")} className="pl-9" />
        </div>
        <Select value={channel} onChange={(e) => setChannel(e.target.value)} aria-label={t("Saluran")} className="w-auto flex-1 sm:flex-none">
          <option value="">{t("Semua saluran")}</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{t(CHANNEL_LABEL[c])}</option>)}
        </Select>
        <Select value={state} onChange={(e) => setState(e.target.value)} aria-label={t("Status")} className="w-auto flex-1 sm:flex-none">
          <option value="">{t("Semua status")}</option>
          <option value="paid">{t("Lunas")}</option>
          <option value="waiting">{t("Kode belum diaktifkan")}</option>
          <option value="nocode">{t("Belum ada kode")}</option>
          <option value="refunded">{t("Refund")}</option>
        </Select>
        <Button variant="dark" icon={<Plus />} disabled={disabled || !plans.length} onClick={() => setForm({ open: true, sale: null })}>{t("Tambah Pembeli")}</Button>
      </div>

      <Card className="p-0 sm:p-0">
        {list.length === 0 && (
          <p className="px-5 py-10 text-center text-[13px] text-neutral-500">{sales.length === 0 ? t("Belum ada pembeli tercatat. Tambahkan pembeli pertamamu.") : t("Tidak ada pembeli yang cocok dengan pencarian.")}</p>
        )}
        {list.map((s) => {
          const refunded = s.status === "refunded";
          // Hanya kode yang masih bisa dipakai yang perlu dikirim; kode yang sudah aktif atau dicabut tidak
          const wa = s.code && s.code_status === "available" ? waFor(s.buyer_name, s.buyer_phone, s.code) : null;
          return (
            <div key={s.id} className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 last:border-0 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <p className={`truncate font-medium ${refunded ? "text-neutral-500 line-through" : ""}`}>{s.buyer_name}</p>
                  <StatusPill tone="neutral" icon={false}>{t(CHANNEL_LABEL[s.channel as Source] ?? s.channel)}</StatusPill>
                  {refunded && <StatusPill tone="caution">{t("Refund")}</StatusPill>}
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {[s.plan_name, formatDateCompact(s.sold_on, undefined, lang), s.reference && `#${s.reference}`].filter(Boolean).join(" · ")}
                </p>
                {(s.buyer_email || s.buyer_phone) && <p className="truncate text-xs text-neutral-500">{[s.buyer_email, s.buyer_phone && `+${s.buyer_phone}`].filter(Boolean).join(" · ")}</p>}
                {s.code && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <code className="tabular rounded-md bg-neutral-100 px-1.5 py-0.5 font-semibold tracking-wider text-neutral-800">{s.code}</code>
                    {s.code_status === "redeemed" && <StatusPill tone="positive">{t("Sudah aktif")}</StatusPill>}
                    {s.code_status === "available" && <StatusPill tone="caution">{t("Belum diaktifkan")}</StatusPill>}
                    {s.code_status === "revoked" && <StatusPill tone="danger">{t("Dicabut")}</StatusPill>}
                    {s.redeemer && <span className="min-w-0 truncate text-neutral-500">{s.redeemer}{s.redeemed_at ? ` (${formatDateCompact(s.redeemed_at, undefined, lang)})` : ""}</span>}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 md:justify-end">
                <div className="text-right">
                  <p className={`tabular text-sm font-semibold ${refunded ? "text-neutral-400 line-through" : ""}`}>{formatIDR(s.gross_idr)}</p>
                  {s.fee_idr > 0 && <p className="tabular text-xs text-neutral-500">{t("Bersih {v1}", { v1: formatIDR(s.gross_idr - s.fee_idr) })}</p>}
                </div>
                <div className="flex items-center">
                  {s.code && wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" title={t("Kirim kode via WhatsApp")} aria-label={t("Kirim kode via WhatsApp")} className={buttonClass("ghost", "icon-sm")}>
                      <WhatsAppIcon className="size-4 text-[#1FA855]" />
                    </a>
                  )}
                  {s.code && <Button variant="ghost" size="icon-sm" title={t("Salin kode")} aria-label={t("Salin kode")} onClick={() => copy(s.code!)}><Copy /></Button>}
                  {!s.code && !refunded && s.plan_id && (
                    <ActionButton size="icon-sm" variant="ghost" title={t("Terbitkan kode akses")} icon={<KeyRound />} confirmText={t("Terbitkan kode akses untuk {name}?", { name: s.buyer_name })}
                      action={() => issueSaleCode(s.id)} onSuccess={(r) => { if (r.ok && r.data?.code) setIssued(r.data as Issued); }} />
                  )}
                  {!refunded && <Button variant="ghost" size="icon-sm" title={t("Ubah")} aria-label={t("Ubah")} onClick={() => setForm({ open: true, sale: s })}><Pencil /></Button>}
                  {!refunded && (
                    <ActionButton size="icon-sm" variant="ghost" title={t("Refund")} icon={<RotateCcw />}
                      confirmText={s.code_status === "redeemed" ? t("Refund {name}? Akses yang sudah diaktifkan lewat kodenya akan dicabut.", { name: s.buyer_name }) : t("Refund {name}? Kode akses yang belum dipakai akan dicabut.", { name: s.buyer_name })}
                      action={() => refundSale(s.id)} />
                  )}
                  <ActionButton size="icon-sm" variant="ghost" title={t("Hapus")} icon={<Trash2 />} confirmText={t("Hapus catatan {name}? Tindakan ini tidak bisa dibatalkan.", { name: s.buyer_name })} action={() => deleteSale(s.id)} />
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      <Modal open={form.open} onClose={() => setForm({ open: false, sale: null })} title={form.sale ? t("Ubah Pembeli") : t("Tambah Pembeli")} size="lg">
        {form.open && (
          <SaleForm key={form.sale?.id ?? "baru"} sale={form.sale} plans={plans}
            onClose={() => setForm({ open: false, sale: null })}
            onDone={(r) => { setForm({ open: false, sale: null }); if (r.ok && r.data?.code) setIssued(r.data as Issued); }} />
        )}
      </Modal>

      <Modal open={!!issued} onClose={() => setIssued(null)} title={t("Kode akses siap dikirim")} description={issued ? t("Kirim kode ini ke {name}. Satu kode untuk satu kali aktivasi.", { name: issued.name }) : undefined}>
        {issued && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-plum-50 px-4 py-4">
              <code className="tabular text-[20px] font-bold tracking-[0.12em] text-plum-800">{issued.code}</code>
              <Button variant="outline" size="md" icon={<Copy />} onClick={() => copy(issued.code)}>{t("Salin")}</Button>
            </div>
            {issued.phone ? (
              <a href={whatsappLink(issued.phone, buyerMessage({ name: issued.name, code: issued.code, appUrl })) ?? "#"} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg", "w-full")}>
                <WhatsAppIcon className="size-[18px]" />{t("Kirim lewat WhatsApp")}
              </a>
            ) : (
              <p className="text-[13px] leading-5 text-neutral-600">{t("Nomor WhatsApp pembeli tidak diisi. Salin kodenya dan kirim lewat saluran tempat kamu berbicara dengannya.")}</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

function SaleForm({ sale, plans, onClose, onDone }: { sale: SaleItem | null; plans: PlanOpt[]; onClose: () => void; onDone: (r: Parameters<NonNullable<React.ComponentProps<typeof ActionForm>["onSuccess"]>>[0]) => void }) {
  const { t } = useI18n();
  const [planId, setPlanId] = useState(sale?.plan_id ?? plans[0]?.id ?? "");
  const [gross, setGross] = useState(sale ? String(sale.gross_idr) : plans[0] ? String(plans[0].price_idr) : "");
  // Nominal mengikuti harga paket sampai diubah sendiri (promo di toko bisa membuat harganya berbeda)
  const [grossTouched, setGrossTouched] = useState(!!sale);
  const editing = !!sale;

  return (
    <ActionForm action={editing ? updateSale : createSale} onSuccess={onDone}>
      {editing && <input type="hidden" name="id" value={sale.id} />}
      <FormGrid>
        <Field label={t("Nama pembeli")} htmlFor="sl-name" className="sm:col-span-2"><Input id="sl-name" name="buyer_name" required maxLength={120} defaultValue={sale?.buyer_name ?? ""} autoComplete="off" /></Field>
        <Field label={t("Saluran")} htmlFor="sl-channel">
          <Select id="sl-channel" name="channel" defaultValue={sale?.channel ?? "lynk"}>{CHANNELS.map((c) => <option key={c} value={c}>{t(CHANNEL_LABEL[c])}</option>)}</Select>
        </Field>
        <Field label={t("Paket")} htmlFor="sl-plan">
          <Select id="sl-plan" name="plan_id" required value={planId} onChange={(e) => {
            setPlanId(e.target.value);
            const p = plans.find((x) => x.id === e.target.value);
            if (p && !grossTouched) setGross(String(p.price_idr));
          }}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        </Field>
        <Field label={t("Nominal dibayar (Rp)")} htmlFor="sl-gross" help={t("Yang dibayar pembeli, sesuai harga dan promo di toko.")}>
          <Input id="sl-gross" name="gross_idr" required inputMode="numeric" value={gross} onChange={(e) => { setGross(e.target.value); setGrossTouched(true); }} />
        </Field>
        <Field label={t("Potongan platform (Rp)")} htmlFor="sl-fee" help={t("Biaya admin Lynk.id atau payment, bila ada.")}>
          <Input id="sl-fee" name="fee_idr" inputMode="numeric" defaultValue={sale ? String(sale.fee_idr) : "0"} />
        </Field>
        <Field label={t("Tanggal transaksi")} htmlFor="sl-date"><DateField id="sl-date" name="sold_on" required defaultValue={sale?.sold_on ?? todayWib()} max={todayWib()} /></Field>
        <Field label={t("Nomor pesanan")} htmlFor="sl-ref" help={t("Nomor order di Lynk.id. Mencegah pesanan yang sama tercatat dua kali.")}>
          <Input id="sl-ref" name="reference" maxLength={80} defaultValue={sale?.reference ?? ""} autoComplete="off" />
        </Field>
        <Field label={t("Email pembeli")} htmlFor="sl-email"><Input id="sl-email" name="buyer_email" type="email" maxLength={160} defaultValue={sale?.buyer_email ?? ""} autoComplete="off" /></Field>
        <Field label={t("WhatsApp pembeli")} htmlFor="sl-phone" help={t("Dipakai untuk mengirim kode akses.")}>
          <Input id="sl-phone" name="buyer_phone" type="tel" inputMode="tel" maxLength={24} placeholder="0812 3456 7890" defaultValue={sale?.buyer_phone ? `+${sale.buyer_phone}` : ""} autoComplete="off" />
        </Field>
      </FormGrid>
      <Field label={t("Catatan")} htmlFor="sl-notes"><Textarea id="sl-notes" name="notes" maxLength={500} defaultValue={sale?.notes ?? ""} /></Field>
      {!editing && (
        <label className="flex items-start gap-3 rounded-xl bg-plum-50 px-4 py-3 text-[13px] leading-5 text-neutral-700">
          <input type="checkbox" name="issue_code" defaultChecked className="mt-0.5 size-4 accent-plum-600" />
          <span><b className="font-semibold text-neutral-900">{t("Terbitkan kode akses otomatis")}</b><br />{t("Kode sekali pakai dibuat untuk paket ini, lalu bisa langsung dikirim ke pembeli.")}</span>
        </label>
      )}
      <FormActions><Button variant="secondary" onClick={onClose}>{t("Batal")}</Button><SubmitButton>{editing ? t("Simpan") : t("Catat Pembeli")}</SubmitButton></FormActions>
    </ActionForm>
  );
}
