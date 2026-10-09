"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import {
  CircleCheck, Copy, Download, FileUp, Link2, Mail, MessageCircle, MessageSquareText, Pencil, Plus, RefreshCw, Search, Send, Trash2, Users, X,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill, type Tone } from "@/components/ui/pill";
import { Segmented } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/dialogs";
import { cn } from "@/components/ui/cn";
import { GUEST_CATEGORY, PARTY_SIDE, RSVP_STATUS, labelOf } from "@/lib/constants";
import { formatDateCompact, formatPhone, normalizePhone, waLink } from "@/lib/format";
import { composeMessage, PLACEHOLDERS, type EventLite } from "@/lib/messages";
import {
  deleteGuests, importGuests, markInvitationSent, regenerateRsvpToken, saveGuest, saveTemplate, setGuestsGroup,
} from "@/features/guests/actions";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";

type Guest = {
  id: string; name: string; phone_e164: string | null; side: string; category: string; group_id: string | null; pax_invited: number;
  rsvp_token: string; rsvp_status: string; pax_confirmed: number; rsvp_message: string | null; rsvp_responded_at: string | null;
  invitation_sent_at: string | null; notes: string | null;
};
type Group = { id: string; name: string; side: string };

const rsvpTone = (s: string): Tone => (s === "hadir" ? "positive" : s === "tidak_hadir" ? "danger" : s === "ragu" ? "caution" : "neutral");

export function GuestsClient({ projectId, tz, coupleName, rsvpDeadline, guests, groups, events, invites, template, baseUrl, canWrite }: {
  projectId: string; tz: string; coupleName: string; rsvpDeadline: string | null; guests: Guest[]; groups: Group[]; events: EventLite[];
  invites: { guest_id: string; event_id: string }[]; template: { id: string | null; name: string; body: string }; baseUrl: string; canWrite: boolean;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [, start] = useTransition();
  const [tab, setTab] = useState<"tamu" | "ucapan">("tamu");
  const [q, setQ] = useState("");
  const [fGroup, setFGroup] = useState("");
  const [fSide, setFSide] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSent, setFSent] = useState("");
  const [limit, setLimit] = useState(100);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<Guest | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [seqOpen, setSeqOpen] = useState(false);

  const invitesByGuest = useMemo(() => {
    const m = new Map<string, string[]>();
    invites.forEach((i) => m.set(i.guest_id, [...(m.get(i.guest_id) ?? []), i.event_id]));
    return m;
  }, [invites]);
  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name;

  const stats = {
    total: guests.length,
    pax: guests.reduce((s, g) => s + g.pax_invited, 0),
    hadir: guests.filter((g) => g.rsvp_status === "hadir"),
    tidak: guests.filter((g) => g.rsvp_status === "tidak_hadir").length,
    ragu: guests.filter((g) => g.rsvp_status === "ragu").length,
    belum: guests.filter((g) => g.rsvp_status === "belum_respon").length,
    sent: guests.filter((g) => g.invitation_sent_at).length,
  };

  const filtered = guests.filter((g) =>
    (!q || g.name.toLowerCase().includes(q.toLowerCase()) || g.phone_e164?.includes(q.replace(/\D/g, "") || "~")) &&
    (!fGroup || g.group_id === fGroup) && (!fSide || g.side === fSide) && (!fStatus || g.rsvp_status === fStatus) &&
    (!fSent || (fSent === "sudah" ? !!g.invitation_sent_at : !g.invitation_sent_at)));

  const link = (g: Guest) => `${baseUrl}/rsvp/${g.rsvp_token}`;
  const messageFor = (g: Guest) => {
    const ids = invitesByGuest.get(g.id);
    const evs = ids?.length ? events.filter((e) => ids.includes(e.id)) : events;
    return composeMessage(template.body, { guestName: g.name, coupleName, events: evs, link: link(g), tz });
  };
  function sendWA(g: Guest) {
    if (!g.phone_e164) return toast("Tamu ini belum punya nomor WhatsApp.", "danger");
    window.open(waLink(g.phone_e164, messageFor(g)), "_blank", "noopener");
    if (canWrite) start(async () => { await markInvitationSent(projectId, [g.id]); });
  }
  function toggleSel(id: string) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }
  const bulk = (fn: () => Promise<{ ok: boolean; message?: string; error?: string } | any>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { if (r.message) toast(r.message); setSelected(new Set()); } else toast(r.error, "danger");
    });

  return (
    <>
      <ProductTour id="tamu" steps={TOURS.tamu} />
      <PageHeader
        title="Tamu & RSVP"
        description={`Kirim undangan lewat WhatsApp dan pantau konfirmasi kehadiran.${rsvpDeadline ? ` Batas RSVP ${formatDateCompact(rsvpDeadline)}.` : ""}`}
        actions={
          <>
            <ButtonLink href={`/api/export/${projectId}/tamu`} variant="outline" icon={<Download />} prefetch={false}>Ekspor</ButtonLink>
            {canWrite && <Button variant="dark" icon={<Plus />} onClick={() => setForm("new")}>Tambah Tamu</Button>}
          </>
        }
      />

      <div data-tour="tamu-stats" className="-mx-4 mb-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-5 md:px-0">
        {[
          { label: "Undangan", value: stats.total, sub: `${stats.sent} sudah dikirim` },
          { label: "Total Pax", value: stats.pax, sub: "kuota undangan" },
          { label: "Hadir", value: stats.hadir.length, sub: `${stats.hadir.reduce((s, g) => s + g.pax_confirmed, 0)} pax` },
          { label: "Tidak Hadir", value: stats.tidak, sub: `${stats.ragu} masih ragu` },
          { label: "Belum Respon", value: stats.belum, sub: "tamu" },
        ].map((s) => (
          <div key={s.label} className="min-w-[150px] snap-start rounded-lg border border-neutral-200 bg-surface p-4">
            <p className="text-[13px] font-medium text-neutral-600">{s.label}</p>
            <p className="tabular mt-1 text-[26px] leading-8 font-bold text-neutral-900">{s.value.toLocaleString("id-ID")}</p>
            <p className="text-xs text-neutral-500">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented items={[{ key: "tamu", label: "Daftar Tamu" }, { key: "ucapan", label: `Ucapan (${guests.filter((g) => g.rsvp_message).length})` }]} value={tab} onChange={setTab} />
        {canWrite && tab === "tamu" && (
          <div data-tour="tamu-actions" className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" icon={<FileUp />} onClick={() => setImportOpen(true)}>Impor</Button>
            <Button variant="outline" size="sm" icon={<MessageSquareText />} onClick={() => setTplOpen(true)}>Template Pesan</Button>
            <Button size="sm" icon={<Send />} onClick={() => setSeqOpen(true)} disabled={!guests.some((g) => !g.invitation_sent_at && g.phone_e164)}>Kirim Berurutan</Button>
          </div>
        )}
      </div>

      {tab === "ucapan" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {guests.filter((g) => g.rsvp_message).sort((a, b) => (b.rsvp_responded_at ?? "").localeCompare(a.rsvp_responded_at ?? "")).map((g) => (
            <Card key={g.id}>
              <div className="flex items-center gap-2"><span className="font-semibold">{g.name}</span><StatusPill tone={rsvpTone(g.rsvp_status)}>{labelOf(RSVP_STATUS, g.rsvp_status)}</StatusPill></div>
              <p className="mt-2 text-sm whitespace-pre-line text-neutral-700">“{g.rsvp_message}”</p>
              <p className="mt-2 text-xs text-neutral-500">{formatDateCompact(g.rsvp_responded_at, tz)}</p>
            </Card>
          ))}
          {!guests.some((g) => g.rsvp_message) && <Card className="md:col-span-2"><p className="py-6 text-center text-[13px] text-neutral-500">Belum ada ucapan dari tamu.</p></Card>}
        </div>
      ) : guests.length === 0 ? (
        <Card>
          <EmptyState icon={<Users />} title="Daftar tamu masih kosong" text="Tambahkan satu per satu atau impor dari Excel."
            action={canWrite && <Button icon={<FileUp />} onClick={() => setImportOpen(true)}>Impor Tamu</Button>} />
        </Card>
      ) : (
        <Card className="p-0 sm:p-0">
          <div data-tour="tamu-filter" className="grid gap-2 border-b border-neutral-200 p-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau nomor" className="pl-9" aria-label="Cari tamu" />
            </div>
            <Select value={fGroup} onChange={(e) => setFGroup(e.target.value)} aria-label="Filter grup"><option value="">Semua grup</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select>
            <Select value={fSide} onChange={(e) => setFSide(e.target.value)} aria-label="Filter pihak"><option value="">Semua pihak</option>{PARTY_SIDE.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
            <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filter status RSVP"><option value="">Semua status</option>{RSVP_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
            <Select value={fSent} onChange={(e) => setFSent(e.target.value)} aria-label="Filter pengiriman"><option value="">Terkirim & belum</option><option value="sudah">Sudah dikirim</option><option value="belum">Belum dikirim</option></Select>
          </div>
          <div className="hidden grid-cols-[32px_1.5fr_1fr_1fr_70px_130px_120px_40px] items-center gap-3 bg-neutral-50 px-5 py-2.5 text-xs font-medium text-neutral-500 md:grid">
            <span>{canWrite && <Checkbox aria-label="Pilih semua" checked={filtered.length > 0 && filtered.every((g) => selected.has(g.id))} onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((g) => g.id)) : new Set())} />}</span>
            <span>Nama</span><span>Grup</span><span>WhatsApp</span><span className="text-right">Pax</span><span>RSVP</span><span>Undangan</span><span />
          </div>
          {filtered.slice(0, limit).map((g) => (
            <div key={g.id} className={cn("grid grid-cols-[24px_1fr_auto] items-start gap-x-3 gap-y-1 border-b border-neutral-200 px-4 py-3 hover:bg-plum-50 sm:px-5 md:grid-cols-[32px_1.5fr_1fr_1fr_70px_130px_120px_40px] md:items-center", selected.has(g.id) && "bg-plum-50")}>
              <span className="pt-0.5 md:pt-0">{canWrite && <Checkbox aria-label={`Pilih ${g.name}`} checked={selected.has(g.id)} onChange={() => toggleSel(g.id)} />}</span>
              <div className="min-w-0">
                <button onClick={() => setForm(g)} className="block truncate text-left text-sm font-medium text-neutral-800 hover:text-plum-700">{g.name}</button>
                <span className="text-xs text-neutral-500">{labelOf(PARTY_SIDE, g.side)} · {labelOf(GUEST_CATEGORY, g.category)}</span>
              </div>
              <div className="col-start-3 row-start-1 md:hidden">{rowMenu(g)}</div>
              <span className="col-start-2 truncate text-[13px] text-neutral-600 md:col-start-auto">{groupName(g.group_id) ?? "-"}</span>
              <span className="col-start-2 text-[13px] text-neutral-600 tabular md:col-start-auto">{formatPhone(g.phone_e164)}</span>
              <span className="col-start-2 text-[13px] text-neutral-600 tabular md:col-start-auto md:text-right">{g.rsvp_status === "hadir" ? `${g.pax_confirmed}/` : ""}{g.pax_invited} pax</span>
              <span className="col-start-2 md:col-start-auto"><StatusPill tone={rsvpTone(g.rsvp_status)}>{labelOf(RSVP_STATUS, g.rsvp_status)}</StatusPill></span>
              <span className="col-start-2 md:col-start-auto">
                {g.invitation_sent_at ? (
                  <span className="inline-flex items-center gap-1 text-xs text-plum-700"><CircleCheck className="size-3.5" />Terkirim</span>
                ) : canWrite && g.phone_e164 ? (
                  <Button data-tour="tamu-send" size="sm" variant="secondary" icon={<MessageCircle />} onClick={() => sendWA(g)}>Kirim WA</Button>
                ) : <span className="text-xs text-neutral-400">Belum</span>}
              </span>
              <div className="hidden md:block">{rowMenu(g)}</div>
            </div>
          ))}
          {filtered.length > limit && (
            <button className="w-full py-3 text-[13px] font-medium text-plum-600 hover:bg-plum-50" onClick={() => setLimit(limit + 200)}>
              Tampilkan lebih banyak ({filtered.length - limit} lagi)
            </button>
          )}
          {filtered.length === 0 && <p className="py-8 text-center text-[13px] text-neutral-500">Tidak ada tamu yang cocok dengan filter.</p>}
        </Card>
      )}

      {selected.size > 0 && (
        <div className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-full border border-neutral-200 bg-surface px-4 py-2 shadow-pop md:bottom-6">
          <span className="text-sm font-semibold">{selected.size} dipilih</span>
          <Select className="h-8 w-auto flex-1 rounded-full text-[13px]" defaultValue="" onChange={(e) => {
            if (e.target.value === "") return;
            bulk(() => setGuestsGroup(projectId, [...selected], e.target.value === "none" ? null : e.target.value));
            e.target.value = "";
          }} aria-label="Ubah grup">
            <option value="">Ubah grup…</option>
            <option value="none">Tanpa grup</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
          <Button size="sm" variant="secondary" icon={<CircleCheck />} onClick={() => bulk(() => markInvitationSent(projectId, [...selected]))}>Tandai terkirim</Button>
          <Button size="sm" variant="danger" icon={<Trash2 />} onClick={async () => {
            if (await confirm({ title: `Hapus ${selected.size} tamu?`, body: "Jawaban RSVP dan ucapan dari tamu ini ikut terhapus. Tindakan ini tidak bisa dibatalkan.", tone: "danger", confirmLabel: "Hapus" })) {
              bulk(() => deleteGuests(projectId, [...selected]));
            }
          }}>Hapus</Button>
          <button aria-label="Batal pilih" onClick={() => setSelected(new Set())} className="p-1 text-neutral-500"><X className="size-4" /></button>
        </div>
      )}

      {form && <GuestForm projectId={projectId} guest={form === "new" ? null : form} groups={groups} events={events} invited={form === "new" ? events.map((e) => e.id) : invitesByGuest.get(form.id) ?? []} canWrite={canWrite} onClose={() => setForm(null)} />}
      {importOpen && <ImportModal projectId={projectId} existingPhones={new Set(guests.map((g) => g.phone_e164).filter(Boolean) as string[])} onClose={() => setImportOpen(false)} />}
      {tplOpen && <TemplateModal projectId={projectId} template={template} coupleName={coupleName} events={events} tz={tz} onClose={() => setTplOpen(false)} />}
      {seqOpen && <SequentialModal guests={guests.filter((g) => !g.invitation_sent_at && g.phone_e164)} onSend={sendWA} onClose={() => setSeqOpen(false)} />}
    </>
  );

  function rowMenu(g: Guest) {
    return (
      <RowMenu items={[
        { label: "Kirim via WhatsApp", icon: <MessageCircle />, hidden: !g.phone_e164, onClick: () => sendWA(g) },
        { label: "Salin link RSVP", icon: <Copy />, onClick: () => { navigator.clipboard.writeText(link(g)); toast("Link RSVP disalin."); } },
        { label: "Buka halaman RSVP", icon: <Link2 />, href: link(g), external: true },
        { label: "Ubah", icon: <Pencil />, hidden: !canWrite, onClick: () => setForm(g) },
        { label: "Hapus tanda terkirim", icon: <X />, hidden: !canWrite || !g.invitation_sent_at, action: () => markInvitationSent(projectId, [g.id], false) },
        { label: "Buat ulang link RSVP", icon: <RefreshCw />, hidden: !canWrite, confirm: "Link lama tidak akan bisa dipakai lagi. Lanjutkan?", action: () => regenerateRsvpToken(projectId, g.id) },
        { label: "Hapus", icon: <Trash2 />, danger: true, hidden: !canWrite, confirm: `Hapus ${g.name}?`, action: () => deleteGuests(projectId, [g.id]) },
      ]} />
    );
  }
}

function GuestForm({ projectId, guest, groups, events, invited, canWrite, onClose }: {
  projectId: string; guest: Guest | null; groups: Group[]; events: EventLite[]; invited: string[]; canWrite: boolean; onClose: () => void;
}) {
  const [newGroup, setNewGroup] = useState(false);
  return (
    <Modal open onClose={onClose} title={guest ? (canWrite ? "Ubah Tamu" : "Detail Tamu") : "Tambah Tamu"} size="lg">
      <ActionForm action={(fd) => saveGuest(projectId, fd)} onSuccess={onClose}>
        {guest && <input type="hidden" name="id" value={guest.id} />}
        <fieldset disabled={!canWrite} className="flex flex-col gap-4">
          <FormGrid>
            <Field label="Nama" htmlFor="g-name"><Input id="g-name" name="name" required defaultValue={guest?.name} placeholder="Bapak Hendra" /></Field>
            <Field label="Nomor WhatsApp" htmlFor="g-phone" help="08xx, +62, atau 62 akan dinormalisasi."><PhoneInput id="g-phone" name="phone" defaultValue={guest?.phone_e164?.replace(/^62/, "") ?? ""} /></Field>
            <Field label="Pihak" htmlFor="g-side">
              <Select id="g-side" name="side" defaultValue={guest?.side ?? "bersama"}>{PARTY_SIDE.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
            </Field>
            <Field label="Kategori" htmlFor="g-cat">
              <Select id="g-cat" name="category" defaultValue={guest?.category ?? "reguler"}>{GUEST_CATEGORY.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
            </Field>
            <Field label="Grup" htmlFor="g-group">
              {newGroup ? (
                <div className="flex gap-2"><Input id="g-group" name="new_group" placeholder="Teman kantor" autoFocus /><Button variant="ghost" size="icon" aria-label="Batal" onClick={() => setNewGroup(false)}><X /></Button></div>
              ) : (
                <Select id="g-group" name="group_id" defaultValue={guest?.group_id ?? ""} onChange={(e) => e.target.value === "__new" && setNewGroup(true)}>
                  <option value="">Tanpa grup</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  <option value="__new">+ Grup baru</option>
                </Select>
              )}
            </Field>
            <Field label="Kuota pax" htmlFor="g-pax"><Input id="g-pax" type="number" name="pax_invited" min={1} max={20} defaultValue={guest?.pax_invited ?? 1} /></Field>
          </FormGrid>
          {events.length > 0 && (
            <Field label="Diundang ke acara">
              <div className="flex flex-wrap gap-2">
                {events.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-[13px]">
                    <Checkbox name="events" value={e.id} defaultChecked={invited.includes(e.id)} />{e.name}
                  </label>
                ))}
              </div>
            </Field>
          )}
          <Field label="Catatan" htmlFor="g-notes"><Textarea id="g-notes" name="notes" defaultValue={guest?.notes ?? ""} /></Field>
          <label className="flex items-center gap-2 text-[13px] text-neutral-600"><Checkbox name="allow_duplicate" />Tetap simpan walau nomornya sama dengan tamu lain</label>
          {guest?.rsvp_message && <p className="rounded-md bg-plum-50 px-3 py-2 text-[13px] text-plum-800">Ucapan: “{guest.rsvp_message}”</p>}
        </fieldset>
        {canWrite && <FormActions><Button variant="secondary" onClick={onClose}>Batal</Button><SubmitButton>Simpan</SubmitButton></FormActions>}
      </ActionForm>
    </Modal>
  );
}

type ImportRow = { name: string; phone: string | null; side: string | null; group: string | null; category: string | null; pax: number; dup: boolean };

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const k of Object.keys(row)) {
    if (keys.some((x) => k.toLowerCase().replace(/[^a-z]/g, "").includes(x))) {
      const v = row[k];
      if (v !== null && v !== undefined && String(v).trim()) return String(v).trim();
    }
  }
  return null;
}

function ImportModal({ projectId, existingPhones, onClose }: { projectId: string; existingPhones: Set<string>; onClose: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [skipDup, setSkipDup] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function toRows(objs: Record<string, unknown>[]) {
    const seen = new Set(existingPhones);
    const out: ImportRow[] = [];
    for (const o of objs) {
      const name = pick(o, ["nama", "name"]);
      if (!name) continue;
      const phone = pick(o, ["whatsapp", "wa", "nomor", "hp", "telepon", "phone"]);
      const norm = normalizePhone(phone);
      const dup = !!norm && seen.has(norm);
      if (norm) seen.add(norm);
      const paxRaw = Number(pick(o, ["pax", "jumlah", "kuota"]) ?? 1);
      out.push({ name, phone, side: pick(o, ["pihak", "side"]), group: pick(o, ["grup", "group", "kelompok"]), category: pick(o, ["kategori", "category"]), pax: Math.min(20, Math.max(1, Math.round(paxRaw) || 1)), dup });
    }
    return out;
  }

  async function onFile(file: File) {
    setError(null);
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        const data = await readSheet(file);
        const [header, ...body] = data as unknown[][];
        if (!header) throw new Error("File kosong.");
        setRows(toRows(body.map((r) => Object.fromEntries(header.map((h, i) => [String(h ?? `col${i}`), r[i]])))));
      } else {
        const text = await file.text();
        const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
        setRows(toRows(parsed.data));
      }
    } catch (e) {
      setError((e as Error).message || "File tidak bisa dibaca.");
    }
  }

  const dupCount = rows?.filter((r) => r.dup).length ?? 0;

  return (
    <Modal open onClose={onClose} title="Impor Tamu" description="Format CSV atau Excel (.xlsx). Kolom: Nama, WhatsApp, Pihak, Grup, Kategori, Pax." size="lg">
      {!rows ? (
        <div className="flex flex-col gap-3">
          <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-plum-200 bg-plum-50 px-4 py-10 text-center hover:border-plum-400">
            <FileUp className="size-7 text-plum-600" />
            <span className="text-sm font-semibold text-neutral-800">Pilih file CSV atau Excel</span>
            <span className="text-xs text-neutral-500">Baris pertama berisi judul kolom</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <a className="text-center text-[13px] text-plum-600 underline" download="contoh-tamu.csv"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent("Nama,WhatsApp,Pihak,Grup,Kategori,Pax\nBapak Hendra,081234567890,pria,Keluarga besar pria,keluarga,2\n")}`}>Unduh contoh file</a>
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{rows.length} baris siap diimpor{dupCount > 0 && <>, <b className="text-caution">{dupCount} nomor duplikat</b></>}.</p>
          <div className="max-h-72 overflow-auto rounded-md border border-neutral-200">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-neutral-50 text-left text-xs text-neutral-500"><tr><th className="px-3 py-2">Nama</th><th className="px-3 py-2">WhatsApp</th><th className="px-3 py-2">Grup</th><th className="px-3 py-2">Pax</th></tr></thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className={cn("border-t border-neutral-200", r.dup && "bg-caution-bg")}>
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="tabular px-3 py-1.5">{r.phone ?? "-"}{r.dup && <span className="ml-1 text-caution">(duplikat)</span>}</td>
                    <td className="px-3 py-1.5">{r.group ?? "-"}</td>
                    <td className="px-3 py-1.5">{r.pax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dupCount > 0 && <label className="flex items-center gap-2 text-[13px]"><Checkbox checked={skipDup} onChange={(e) => setSkipDup(e.target.checked)} />Lewati nomor duplikat</label>}
          <FormActions>
            <Button variant="secondary" onClick={() => setRows(null)}>Ganti file</Button>
            <Button loading={pending} onClick={() => start(async () => {
              const r = await importGuests(projectId, rows.map(({ dup: _d, ...x }) => x), skipDup);
              if (r.ok) { toast(r.message!); onClose(); } else setError(r.error);
            })}>Impor {rows.length} Tamu</Button>
          </FormActions>
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

function TemplateModal({ projectId, template, coupleName, events, tz, onClose }: {
  projectId: string; template: { id: string | null; name: string; body: string }; coupleName: string; events: EventLite[]; tz: string; onClose: () => void;
}) {
  const [body, setBody] = useState(template.body);
  const ref = useRef<HTMLTextAreaElement>(null);
  const preview = composeMessage(body, { guestName: "Bapak Hendra", coupleName, events, link: "https://monaplan.id/rsvp/contoh", tz });
  function insert(p: string) {
    const el = ref.current;
    if (!el) return setBody(body + p);
    const s = el.selectionStart, e = el.selectionEnd;
    setBody(body.slice(0, s) + p + body.slice(e));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + p.length, s + p.length); });
  }
  return (
    <Modal open onClose={onClose} title="Template Pesan WhatsApp" size="lg">
      <ActionForm action={(fd) => saveTemplate(projectId, fd)} onSuccess={onClose}>
        {template.id && <input type="hidden" name="id" value={template.id} />}
        <input type="hidden" name="name" value={template.name} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button key={p} type="button" onClick={() => insert(p)} className="rounded-full bg-plum-100 px-2.5 py-1 text-xs font-medium text-plum-700 hover:bg-plum-200">{p}</button>
              ))}
            </div>
            <Textarea ref={ref} name="body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-72 text-[13px]" aria-label="Isi template" />
          </div>
          <div className="rounded-lg bg-neutral-100 p-3">
            <p className="mb-2 text-xs font-medium text-neutral-500">Pratinjau</p>
            <div className="max-h-80 overflow-y-auto rounded-lg rounded-tl-none bg-surface p-3 text-[13px] whitespace-pre-line text-neutral-800 shadow-sm">{preview}</div>
          </div>
        </div>
        <FormActions><Button variant="secondary" onClick={onClose}>Batal</Button><SubmitButton>Simpan Template</SubmitButton></FormActions>
      </ActionForm>
    </Modal>
  );
}

function SequentialModal({ guests, onSend, onClose }: { guests: Guest[]; onSend: (g: Guest) => void; onClose: () => void }) {
  const [queue] = useState(guests);
  const [i, setI] = useState(0);
  const g = queue[i];
  return (
    <Modal open onClose={onClose} title="Kirim Berurutan" description="Setelah satu terkirim, langsung lanjut ke tamu berikutnya yang belum dikirimi.">
      {g ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="text-xs text-neutral-500 tabular">{i + 1} dari {queue.length}</span>
          <Mail className="size-8 text-plum-600" />
          <p className="text-lg font-semibold">{g.name}</p>
          <p className="tabular text-[13px] text-neutral-600">{formatPhone(g.phone_e164)}</p>
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" onClick={() => setI(i + 1)}>Lewati</Button>
            <Button size="lg" icon={<MessageCircle />} onClick={() => { onSend(g); setI(i + 1); }}>Kirim via WhatsApp</Button>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <CircleCheck className="mx-auto size-10 text-plum-600" />
          <p className="mt-3 font-semibold">Semua undangan sudah dikirim.</p>
          <Button className="mt-4" onClick={onClose}>Selesai</Button>
        </div>
      )}
    </Modal>
  );
}
