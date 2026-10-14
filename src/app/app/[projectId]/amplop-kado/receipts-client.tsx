"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Download, HandCoins, MessageSquareText, Pencil, Plus, Search, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadLink } from "@/components/ui/download-link";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { DateField } from "@/components/ui/date-field";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill, type Tone } from "@/components/ui/pill";
import { Segmented } from "@/components/ui/tabs";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_THANKS, GIFT_RECEIPT_KIND, PARTY_SIDE, labelOf } from "@/lib/constants";
import { formatDateCompact, formatIDR, todayISO, waLink } from "@/lib/format";
import { PLACEHOLDERS } from "@/lib/messages";
import { deleteReceipt, saveReceipt, setThanked } from "@/features/gift-receipts/actions";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useI18n, useT } from "@/i18n/client";

type Kind = "amplop" | "transfer" | "kado";
type Side = "pria" | "wanita" | "bersama";
type Receipt = {
  id: string; guest_id: string | null; giver_name: string; side: Side; kind: Kind; amount_idr: number | null; item_name: string | null;
  received_on: string; thanked_at: string | null; notes: string | null; recorded_via: string;
};
type Guest = { id: string; name: string; side: Side; phone_e164: string | null };

const KIND_TONE: Record<Kind, Tone> = { amplop: "positive", transfer: "neutral", kado: "caution" };
const thanksKey = (pid: string) => `mp-thanks:${pid}`;

export function ReceiptsClient({ projectId, coupleName, tz, canWrite, receipts, guests }: {
  projectId: string; coupleName: string; tz: string; canWrite: boolean; receipts: Receipt[]; guests: Guest[];
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [side, setSide] = useState("");
  const [unthanked, setUnthanked] = useState(false);
  const [form, setForm] = useState<Receipt | "new" | null>(null);
  const [editThanks, setEditThanks] = useState(false);
  const guestById = useMemo(() => Object.fromEntries(guests.map((g) => [g.id, g])), [guests]);

  const list = useMemo(() => receipts.filter((r) =>
    (!q || r.giver_name.toLowerCase().includes(q.toLowerCase()) || (r.item_name ?? "").toLowerCase().includes(q.toLowerCase())) &&
    (!kind || r.kind === kind) && (!side || r.side === side) && (!unthanked || !r.thanked_at)), [receipts, q, kind, side, unthanked]);

  const money = receipts.filter((r) => r.kind !== "kado").reduce((s, r) => s + (r.amount_idr ?? 0), 0);
  const givers = new Set(receipts.map((r) => r.guest_id ?? r.giver_name.trim().toLowerCase())).size;
  const gifts = receipts.filter((r) => r.kind === "kado").length;
  const thanked = receipts.filter((r) => r.thanked_at).length;

  function thanksText(r: Receipt) {
    let body = DEFAULT_THANKS;
    try { body = localStorage.getItem(thanksKey(projectId)) || DEFAULT_THANKS; } catch {}
    return body.replaceAll("{nama_tamu}", r.giver_name).replaceAll("{nama_pasangan}", coupleName);
  }
  async function sendThanks(r: Receipt) {
    const phone = r.guest_id ? guestById[r.guest_id]?.phone_e164 : null;
    window.open(waLink(phone, thanksText(r)), "_blank", "noopener");
    if (!r.thanked_at && canWrite) {
      const res = await setThanked(projectId, r.id, true);
      if (!res.ok) toast(res.error, "danger");
    }
  }

  return (
    <>
      <ProductTour id="amplop" steps={TOURS["amplop"]!} />
      <PageHeader tour="amplop" title={t("Amplop & Kado")} description={t("Catat tanda kasih dari tamu, lalu kirim ucapan terima kasih.")}
        actions={<>
          {canWrite && <Button variant="dark" icon={<Plus />} onClick={() => setForm("new")} className="md:order-last">{t("Catat")}</Button>}
          <Button variant="outline" icon={<MessageSquareText />} onClick={() => setEditThanks(true)}>{t("Teks ucapan")}</Button>
          {receipts.length > 0 && <DownloadLink href={`/api/export/${projectId}/amplop`} variant="outline" icon={<Download />}>{t("Ekspor")}</DownloadLink>}
        </>} />

      <div data-tour="amplop-stats" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard title={t("Amplop & Transfer")} value={formatIDR(money)} footer={t("{n} catatan", { n: receipts.length - gifts })} />
        <StatCard title={t("Pemberi")} value={givers} footer={t("orang atau keluarga")} />
        <StatCard title={t("Kado")} value={gifts} footer={t("barang")} />
        <StatCard title={t("Sudah Diberi Ucapan")} value={`${thanked}/${receipts.length}`} footer={receipts.length - thanked > 0 ? t("{n} belum", { n: receipts.length - thanked }) : t("Semua sudah")} />
      </div>

      {receipts.length === 0 ? (
        <Card>
          <EmptyState icon={<HandCoins />} title={t("Belum ada catatan")} text={t("Catat amplop dan kado setelah acara agar mudah berterima kasih.")}
            action={canWrite && <Button icon={<Plus />} onClick={() => setForm("new")}>{t("Catat Pertama")}</Button>} />
        </Card>
      ) : (
        <Card tour="amplop-main" className="p-0 sm:p-0">
          <div className="grid grid-cols-2 gap-2 border-b border-neutral-100 p-4 lg:grid-cols-4">
            <div className="relative col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
              <Input placeholder={t("Cari nama atau barang")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label={t("Cari catatan")} />
            </div>
            <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t("Filter jenis")}>
              <option value="">{t("Semua jenis")}</option>
              {GIFT_RECEIPT_KIND.map((k) => <option key={k.key} value={k.key}>{t(k.label)}</option>)}
            </Select>
            <Select value={side} onChange={(e) => setSide(e.target.value)} aria-label={t("Filter pihak")}>
              <option value="">{t("Semua pihak")}</option>
              {PARTY_SIDE.map((s) => <option key={s.key} value={s.key}>{t(s.label)}</option>)}
            </Select>
            <label className="col-span-2 flex h-10 items-center gap-2 rounded-md border border-neutral-200 bg-surface px-3 text-sm lg:col-span-1">
              <input type="checkbox" className="accent-plum-600" checked={unthanked} onChange={(e) => setUnthanked(e.target.checked)} />{" "}{t("Belum diberi ucapan")}</label>
          </div>
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-neutral-500">{t("Tidak ada catatan yang cocok.")}</p>
          ) : (
            <ul>
              {list.map((r) => (
                <li key={r.id} data-row-id={r.id} className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3.5 last:border-b-0 sm:gap-4 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] leading-[21px] font-semibold text-neutral-900">{r.giver_name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-neutral-600">
                      <StatusPill tone={KIND_TONE[r.kind]} icon={false}>{t(labelOf(GIFT_RECEIPT_KIND, r.kind))}</StatusPill>
                      <span>{t(labelOf(PARTY_SIDE, r.side))}</span>
                      <span className="tabular">{formatDateCompact(r.received_on, tz, lang)}</span>
                      {r.recorded_via === "panitia" && <span>{t("Dicatat panitia")}</span>}
                    </p>
                    {r.kind === "kado" && <p className="mt-1 truncate text-[13px] text-neutral-700 sm:hidden">{r.item_name}</p>}
                  </div>
                  <div className="hidden min-w-0 text-right sm:block sm:max-w-[220px]">
                    {r.kind === "kado"
                      ? <p className="truncate text-[14px] text-neutral-800">{r.item_name}</p>
                      : <p className="tabular text-[15px] font-semibold text-neutral-900">{formatIDR(r.amount_idr)}</p>}
                  </div>
                  {r.kind !== "kado" && <p className="tabular shrink-0 text-[14px] font-semibold text-neutral-900 sm:hidden">{formatIDR(r.amount_idr)}</p>}
                  {r.thanked_at
                    ? <span className="hidden shrink-0 sm:inline-flex"><StatusPill tone="neutral" icon={<Check className="size-3" />}>{t("Sudah")}</StatusPill></span>
                    : <Button size="sm" variant="secondary" className="hidden shrink-0 sm:inline-flex" icon={<WhatsAppIcon />} onClick={() => sendThanks(r)}>{t("Kirim ucapan")}</Button>}
                  <RowMenu items={[
                    { label: t("Kirim ucapan"), icon: <WhatsAppIcon />, onClick: () => sendThanks(r) },
                    { label: t("Ubah"), icon: <Pencil />, onClick: () => setForm(r), hidden: !canWrite },
                    { label: t("Tandai belum diberi ucapan"), icon: <Undo2 />, action: () => setThanked(projectId, r.id, false), hidden: !canWrite || !r.thanked_at },
                    { label: t("Tandai sudah diberi ucapan"), icon: <Check />, action: () => setThanked(projectId, r.id, true), hidden: !canWrite || !!r.thanked_at },
                    { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus catatan ini?"), action: () => deleteReceipt(projectId, r.id), hidden: !canWrite },
                  ]} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {form && <ReceiptForm projectId={projectId} tz={tz} item={form === "new" ? null : form} guests={guests} onClose={() => setForm(null)} />}
      {editThanks && <ThanksForm projectId={projectId} onClose={() => setEditThanks(false)} />}
    </>
  );
}

function ReceiptForm({ projectId, tz, item, guests, onClose }: { projectId: string; tz: string; item: Receipt | null; guests: Guest[]; onClose: () => void }) {
  const t = useT();
  const [kind, setKind] = useState<Kind>(item?.kind ?? "amplop");
  const [side, setSide] = useState<Side>(item?.side ?? "bersama");
  const [name, setName] = useState(item?.giver_name ?? "");
  const [round, setRound] = useState(0);
  const again = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  // Nama yang persis sama dengan tamu terdaftar dihubungkan ke tamu itu, dan pihaknya ikut terisi
  const match = useMemo(() => guests.find((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase()), [guests, name]);
  const guestId = match?.id ?? (item && item.giver_name === name ? item.guest_id : null);
  const listId = `rc-guests-${projectId}`;

  return (
    <Modal open onClose={onClose} title={item ? t("Ubah Catatan") : t("Catat Amplop atau Kado")}>
      <ActionForm key={round}
        action={(fd) => saveReceipt(projectId, fd)}
        onSuccess={() => {
          if (!again.current) return onClose();
          again.current = false;
          setName(""); setSide("bersama"); setRound((n) => n + 1);
          setTimeout(() => nameRef.current?.focus(), 50);
        }}>
        {item && <input type="hidden" name="id" value={item.id} />}
        <input type="hidden" name="guest_id" value={guestId ?? ""} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="side" value={side} />
        <Field label={t("Nama pemberi")} htmlFor="rc-name" help={match ? t("Terhubung ke daftar tamu") : t("Ketik untuk memilih dari daftar tamu, atau isi nama baru")}>
          <Input ref={nameRef} id="rc-name" name="giver_name" required maxLength={120} list={listId} autoComplete="off" autoFocus={!item}
            value={name} onChange={(e) => { setName(e.target.value); const g = guests.find((x) => x.name.trim().toLowerCase() === e.target.value.trim().toLowerCase()); if (g) setSide(g.side); }} />
          <datalist id={listId}>{guests.map((g) => <option key={g.id} value={g.name} />)}</datalist>
        </Field>
        <Field label={t("Jenis")}>
          <Segmented fullWidth items={GIFT_RECEIPT_KIND.map((k) => ({ key: k.key as Kind, label: t(k.label) }))} value={kind} onChange={setKind} />
        </Field>
        <FormGrid>
          {kind === "kado"
            ? <Field label={t("Nama barang")} htmlFor="rc-item"><Input id="rc-item" name="item_name" required maxLength={200} defaultValue={item?.item_name ?? ""} /></Field>
            : <Field label={t("Nominal")} htmlFor="rc-amount"><CurrencyInput id="rc-amount" name="amount_idr" required defaultValue={item?.amount_idr} /></Field>}
          <Field label={t("Tanggal diterima")} htmlFor="rc-date"><DateField id="rc-date" name="received_on" defaultValue={item?.received_on ?? todayISO(tz)} /></Field>
        </FormGrid>
        <Field label={t("Pihak")}>
          <Segmented fullWidth items={PARTY_SIDE.map((s) => ({ key: s.key as Side, label: t(s.label) }))} value={side} onChange={setSide} />
        </Field>
        <Field label={t("Catatan")} htmlFor="rc-notes"><Textarea id="rc-notes" name="notes" maxLength={500} rows={2} defaultValue={item?.notes ?? ""} /></Field>
        <FormActions>
          <Button variant="secondary" onClick={onClose}>{t("Batal")}</Button>
          {!item && <SubmitButton variant="outline" onClick={() => { again.current = true; }}>{t("Simpan & catat lagi")}</SubmitButton>}
          <SubmitButton onClick={() => { again.current = false; }}>{t("Simpan")}</SubmitButton>
        </FormActions>
      </ActionForm>
    </Modal>
  );
}

function ThanksForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [body, setBody] = useState(() => { try { return localStorage.getItem(thanksKey(projectId)) || DEFAULT_THANKS; } catch { return DEFAULT_THANKS; } });
  return (
    <Modal open onClose={onClose} title={t("Teks Ucapan Terima Kasih")} description={t("Dipakai tombol Kirim ucapan. {a} diganti nama pemberi, {b} diganti nama kalian. Tersimpan di perangkat ini.", { a: PLACEHOLDERS[0]!, b: PLACEHOLDERS[1]! })}>
      <Textarea aria-label={t("Teks ucapan")} rows={9} value={body} onChange={(e) => setBody(e.target.value)} />
      <FormActions>
        <Button variant="secondary" onClick={() => setBody(DEFAULT_THANKS)}>{t("Kembalikan bawaan")}</Button>
        <Button onClick={() => {
          try { localStorage.setItem(thanksKey(projectId), body.trim() || DEFAULT_THANKS); } catch {}
          toast(t("Teks ucapan tersimpan.")); onClose();
        }}>{t("Simpan")}</Button>
      </FormActions>
    </Modal>
  );
}

