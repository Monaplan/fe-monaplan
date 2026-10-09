"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarDays, Copy, Download, ImagePlus, MapPin, Pencil, Plus, Shirt, Trash2, UserMinus, UserPlus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { ActionButton, ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/pill";
import { Segmented } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { EVENT_TYPES, ROLE_LABEL } from "@/lib/constants";
import { formatDateCompact, formatDateLong, formatTime, initials, isoToLocalParts } from "@/lib/format";
import { uploadProjectFile } from "@/lib/upload";
import type { Member, Project } from "@/lib/access";
import {
  archiveProject, deleteEvent, deleteProject, inviteCollaborator, removeMember, revokeInvitation, saveEvent, updateCouple, updateCover,
  updateMemberRole, updateWeddingInfo,
} from "@/features/project/actions";

type Event = { id: string; type: string; name: string; starts_at: string | null; ends_at: string | null; venue_name: string | null; venue_address: string | null; maps_url: string | null; dress_code: string | null; notes: string | null; sort_order: number };
type Invitation = { id: string; email: string; role: string; expires_at: string; link: string };
type Tab = "pasangan" | "acara" | "budget" | "kolaborator" | "lainnya";

export function SettingsClient({ initialTab, project, events, members, invitations, maxCollaborators, coverUrl, canWrite, isOwner, currentUserId }: {
  initialTab: string; project: Project; events: Event[]; members: Member[]; invitations: Invitation[]; maxCollaborators: number; coverUrl: string | null;
  canWrite: boolean; isOwner: boolean; currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>((["pasangan", "acara", "budget", "kolaborator", "lainnya"].includes(initialTab) ? initialTab : "pasangan") as Tab);
  const [eventForm, setEventForm] = useState<Event | "new" | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dateChanged, setDateChanged] = useState(false);
  const pid = project.id;
  const tz = project.timezone;
  const collabCount = members.filter((m) => m.role !== "owner").length + invitations.length;

  return (
    <>
      <PageHeader title="Pengaturan Pernikahan" description="Data pasangan, acara, budget, dan siapa saja yang ikut merencanakan." />
      <Segmented className="mb-4" value={tab} onChange={setTab} items={[
        { key: "pasangan", label: "Pasangan" },
        { key: "acara", label: "Acara" },
        { key: "budget", label: "Budget dan Tamu" },
        { key: "kolaborator", label: "Kolaborator" },
        { key: "lainnya", label: "Lainnya" },
      ]} />

      {tab === "pasangan" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader title="Data Pasangan" />
            <ActionForm action={(fd) => updateCouple(pid, fd)}>
              <fieldset disabled={!canWrite} className="flex flex-col gap-4">
                <Field label="Judul proyek" htmlFor="s-title" help='Tampil di sapaan dashboard dan halaman RSVP, contoh "Raka & Nadia".'>
                  <Input id="s-title" name="title" defaultValue={project.title} />
                </Field>
                <FormGrid>
                  <Field label="Nama lengkap mempelai pria" htmlFor="s-p1"><Input id="s-p1" name="partner_one_name" required defaultValue={project.partner_one_name} /></Field>
                  <Field label="Panggilan" htmlFor="s-p1n"><Input id="s-p1n" name="partner_one_nickname" defaultValue={project.partner_one_nickname ?? ""} /></Field>
                  <Field label="Nama lengkap mempelai wanita" htmlFor="s-p2"><Input id="s-p2" name="partner_two_name" required defaultValue={project.partner_two_name} /></Field>
                  <Field label="Panggilan" htmlFor="s-p2n"><Input id="s-p2n" name="partner_two_nickname" defaultValue={project.partner_two_nickname ?? ""} /></Field>
                </FormGrid>
              </fieldset>
              {canWrite && <div className="flex justify-end"><SubmitButton>Simpan</SubmitButton></div>}
            </ActionForm>
          </Card>
          <Card>
            <CardHeader title="Foto Sampul" subtitle="Tampil di halaman RSVP tamu." />
            <div className="aspect-[4/5] overflow-hidden rounded-xl bg-plum-50">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Foto sampul" className="size-full object-cover" />
              ) : <span className="flex size-full items-center justify-center text-plum-300"><ImagePlus className="size-10" /></span>}
            </div>
            {canWrite && (
              <div className="mt-3 flex gap-2">
                <label className="flex-1">
                  <span className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-100 text-sm font-medium hover:bg-neutral-200">
                    <ImagePlus className="size-4" />{uploading ? "Mengunggah…" : coverUrl ? "Ganti foto" : "Unggah foto"}
                  </span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    try {
                      const up = await uploadProjectFile(pid, "cover", f);
                      const r = await updateCover(pid, up.path);
                      if (r.ok) toast(r.message!); else toast(r.error, "danger");
                    } catch (err) { toast((err as Error).message, "danger"); }
                    setUploading(false);
                  }} />
                </label>
                {coverUrl && <ActionButton variant="ghost" size="icon" title="Hapus foto" icon={<Trash2 />} confirmText="Hapus foto sampul?" action={() => updateCover(pid, null)} />}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "acara" && (
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <Card key={e.id}>
              <div className="flex items-start gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-plum-100 text-plum-700"><CalendarDays className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-[13px] text-neutral-600">{e.starts_at ? `${formatDateLong(e.starts_at, tz)}, ${formatTime(e.starts_at, tz)}${e.ends_at ? ` sampai ${formatTime(e.ends_at, tz, false)}` : ""}` : "Waktu belum diatur"}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-[13px] text-neutral-600">
                    {e.venue_name && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{e.venue_name}</span>}
                    {e.dress_code && <span className="flex items-center gap-1"><Shirt className="size-3.5" />{e.dress_code}</span>}
                  </div>
                </div>
                {canWrite && <RowMenu items={[
                  { label: "Ubah", icon: <Pencil />, onClick: () => setEventForm(e) },
                  { label: "Hapus", icon: <Trash2 />, danger: true, confirm: `Hapus ${e.name}? Rundown acara ini juga terhapus.`, action: () => deleteEvent(pid, e.id) },
                ]} />}
              </div>
            </Card>
          ))}
          {events.length === 0 && <Card><p className="py-6 text-center text-[13px] text-neutral-500">Belum ada acara.</p></Card>}
          {canWrite && <Button variant="outline" icon={<Plus />} className="self-start" onClick={() => setEventForm("new")}>Tambah Acara</Button>}
        </div>
      )}

      {tab === "budget" && (
        <Card className="max-w-2xl">
          <ActionForm action={(fd) => updateWeddingInfo(pid, fd)} onSuccess={() => setDateChanged(false)}>
            <fieldset disabled={!canWrite} className="flex flex-col gap-4">
              <FormGrid>
                <Field label="Tanggal pernikahan" htmlFor="s-date"><Input id="s-date" type="date" name="wedding_date" defaultValue={project.wedding_date ?? ""} onChange={() => setDateChanged(true)} /></Field>
                <Field label="Kota" htmlFor="s-city"><Input id="s-city" name="city" defaultValue={project.city ?? ""} /></Field>
                <Field label="Zona waktu" htmlFor="s-tz">
                  <Select id="s-tz" name="timezone" defaultValue={tz}>
                    <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                    <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                    <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                  </Select>
                </Field>
                <Field label="Total budget" htmlFor="s-budget"><CurrencyInput id="s-budget" name="total_budget_idr" defaultValue={project.total_budget_idr} /></Field>
                <Field label="Target jumlah tamu" htmlFor="s-guests"><Input id="s-guests" type="number" min={0} name="guest_target" defaultValue={project.guest_target ?? ""} /></Field>
                <Field label="Batas waktu RSVP" htmlFor="s-rsvp" help="Default H-3."><Input id="s-rsvp" type="date" name="rsvp_deadline" defaultValue={project.rsvp_deadline ?? ""} /></Field>
              </FormGrid>
              {dateChanged && (
                <label className="flex items-start gap-2 rounded-md bg-caution-bg px-3 py-3 text-[13px] text-caution">
                  <Checkbox name="shift_tasks" defaultChecked className="mt-0.5" />
                  Geser due date tugas dari checklist rekomendasi yang belum selesai mengikuti tanggal baru.
                </label>
              )}
            </fieldset>
            {canWrite && <div className="flex justify-end"><SubmitButton>Simpan</SubmitButton></div>}
          </ActionForm>
        </Card>
      )}

      {tab === "kolaborator" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader title="Anggota" subtitle={`${collabCount}/${maxCollaborators} kolaborator`} />
            <ul className="divide-y divide-neutral-200">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 py-3">
                  {m.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.profiles.avatar_url} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full object-cover" />
                  ) : <span className="inline-flex size-9 items-center justify-center rounded-full bg-plum-100 text-xs font-semibold text-plum-700">{initials(m.profiles?.full_name ?? m.profiles?.email)}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.profiles?.full_name ?? m.profiles?.email}{m.user_id === currentUserId && " (kamu)"}</p>
                    <p className="truncate text-xs text-neutral-500">{m.profiles?.email}</p>
                  </div>
                  <StatusPill tone={m.role === "owner" ? "positive" : "neutral"} icon={false}>{ROLE_LABEL[m.role]}</StatusPill>
                  {m.role !== "owner" && (isOwner || m.user_id === currentUserId) && (
                    <RowMenu items={[
                      { label: "Jadikan Editor", hidden: !isOwner || m.role === "editor", action: () => updateMemberRole(pid, m.user_id, "editor") },
                      { label: "Jadikan Viewer", hidden: !isOwner || m.role === "viewer", action: () => updateMemberRole(pid, m.user_id, "viewer") },
                      { label: m.user_id === currentUserId ? "Keluar dari proyek" : "Keluarkan", icon: <UserMinus />, danger: true, confirm: "Yakin?", action: async () => {
                        const r = await removeMember(pid, m.user_id);
                        if (r.ok && m.user_id === currentUserId) router.push("/mulai");
                        return r;
                      } },
                    ]} />
                  )}
                </li>
              ))}
              {invitations.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-full border border-dashed border-neutral-300 text-neutral-400"><UserPlus className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.email}</p>
                    <p className="text-xs text-neutral-500">Menunggu · berlaku sampai {formatDateCompact(i.expires_at)}</p>
                  </div>
                  <StatusPill tone="caution" icon={false}>{ROLE_LABEL[i.role]}</StatusPill>
                  <RowMenu items={[
                    { label: "Salin link undangan", icon: <Copy />, onClick: () => { navigator.clipboard.writeText(i.link); toast("Link undangan disalin."); } },
                    { label: "Batalkan undangan", icon: <Trash2 />, danger: true, action: () => revokeInvitation(pid, i.id) },
                  ]} />
                </li>
              ))}
            </ul>
          </Card>
          {isOwner ? (
            <Card>
              <CardHeader icon={<UserPlus />} title="Undang Kolaborator" subtitle="Pasangan, orang tua, saudara, atau WO." />
              {collabCount >= maxCollaborators ? (
                <p className="text-[13px] text-neutral-600">Kuota kolaborator sudah penuh. Keluarkan anggota atau batalkan undangan untuk mengundang orang lain.</p>
              ) : (
                <ActionForm action={(fd) => inviteCollaborator(pid, fd)} reset onSuccess={(r) => r.ok && setInviteLink(r.data.link)}>
                  <Field label="Email Google" htmlFor="inv-email" help="Penerima harus masuk dengan akun Google yang memakai email ini.">
                    <Input id="inv-email" type="email" name="email" required placeholder="nadia@gmail.com" />
                  </Field>
                  <Field label="Peran" htmlFor="inv-role">
                    <Select id="inv-role" name="role" defaultValue="editor">
                      <option value="editor">Editor: bisa melihat dan mengubah data</option>
                      <option value="viewer">Viewer: hanya bisa melihat</option>
                    </Select>
                  </Field>
                  <SubmitButton icon={<UserPlus />}>Kirim Undangan</SubmitButton>
                </ActionForm>
              )}
              {inviteLink && (
                <div className="mt-4 rounded-md bg-plum-50 p-3">
                  <p className="mb-2 text-xs text-neutral-600">Link undangan (berlaku 7 hari):</p>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteLink} className="h-9 text-xs" onFocus={(e) => e.target.select()} />
                    <Button size="sm" variant="secondary" icon={<Copy />} onClick={() => { navigator.clipboard.writeText(inviteLink); toast("Link disalin."); }}>Salin</Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card><p className="text-[13px] text-neutral-600">Hanya pemilik ruang kerja yang bisa mengundang dan mengatur kolaborator.</p></Card>
          )}
        </div>
      )}

      {tab === "lainnya" && (
        <div className="flex max-w-2xl flex-col gap-4">
          <Card>
            <CardHeader icon={<Download />} title="Ekspor Data" subtitle="Unduh data per modul dalam format CSV yang bisa dibuka di Excel." />
            <div className="flex flex-wrap gap-2">
              {[["tamu", "Tamu & RSVP"], ["budget", "Budget"], ["checklist", "Checklist"], ["vendor", "Vendor"], ["rundown", "Rundown"], ["mahar", "Mahar & Seserahan"]].map(([k, l]) => (
                <ButtonLink key={k} href={`/api/export/${pid}/${k}`} prefetch={false} variant="outline" size="sm" icon={<Download />}>{l}</ButtonLink>
              ))}
            </div>
          </Card>
          {isOwner && (
            <Card className="border-danger">
              <CardHeader title="Area Berbahaya" />
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{project.archived_at ? "Aktifkan kembali proyek" : "Arsipkan proyek"}</p>
                    <p className="text-[13px] text-neutral-500">Proyek terarsip hanya bisa dilihat dan tidak dihitung dalam batas proyek.</p>
                  </div>
                  <ActionButton variant="outline" size="md" icon={<Archive />} confirmText={project.archived_at ? undefined : "Arsipkan proyek ini?"} action={() => archiveProject(pid, !project.archived_at)}>
                    {project.archived_at ? "Aktifkan" : "Arsipkan"}
                  </ActionButton>
                </div>
                <div className="border-t border-neutral-200 pt-4">
                  <p className="text-sm font-medium text-danger">Hapus proyek</p>
                  <p className="mb-3 text-[13px] text-neutral-500">Semua data dan berkas proyek akan dihapus permanen. Ketik <b>{project.title}</b> untuk konfirmasi.</p>
                  <ActionForm action={(fd) => deleteProject(pid, fd)} onSuccess={() => router.push("/mulai")} className="sm:flex-row">
                    <Input name="confirm" placeholder={project.title} required aria-label="Konfirmasi nama proyek" />
                    <SubmitButton variant="danger" icon={<Trash2 />}>Hapus Permanen</SubmitButton>
                  </ActionForm>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      <Modal open={!!eventForm} onClose={() => setEventForm(null)} title={eventForm === "new" ? "Tambah Acara" : "Ubah Acara"} size="lg">
        {eventForm && <EventForm projectId={pid} tz={tz} event={eventForm === "new" ? null : eventForm} defaultDate={project.wedding_date} nextOrder={events.length + 1} onClose={() => setEventForm(null)} />}
      </Modal>
    </>
  );
}

function EventForm({ projectId, tz, event, defaultDate, nextOrder, onClose }: { projectId: string; tz: string; event: Event | null; defaultDate: string | null; nextOrder: number; onClose: () => void }) {
  const s = isoToLocalParts(event?.starts_at, tz);
  const e = isoToLocalParts(event?.ends_at, tz);
  return (
    <ActionForm action={(fd) => saveEvent(projectId, fd)} onSuccess={onClose}>
      {event && <input type="hidden" name="id" value={event.id} />}
      <input type="hidden" name="sort_order" value={event?.sort_order ?? nextOrder} />
      <FormGrid>
        <Field label="Jenis acara" htmlFor="e-type">
          <Select id="e-type" name="type" defaultValue={event?.type ?? "resepsi"}>{EVENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select>
        </Field>
        <Field label="Nama acara" htmlFor="e-name"><Input id="e-name" name="name" defaultValue={event?.name} placeholder="Resepsi" /></Field>
        <Field label="Tanggal" htmlFor="e-date"><Input id="e-date" type="date" name="date" defaultValue={s.date || defaultDate || ""} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Mulai" htmlFor="e-start"><Input id="e-start" type="time" name="start_time" defaultValue={s.time} /></Field>
          <Field label="Selesai" htmlFor="e-end"><Input id="e-end" type="time" name="end_time" defaultValue={e.time} /></Field>
        </div>
        <Field label="Nama tempat" htmlFor="e-venue"><Input id="e-venue" name="venue_name" defaultValue={event?.venue_name ?? ""} /></Field>
        <Field label="Dress code" htmlFor="e-dress"><Input id="e-dress" name="dress_code" defaultValue={event?.dress_code ?? ""} /></Field>
      </FormGrid>
      <Field label="Alamat" htmlFor="e-addr"><Input id="e-addr" name="venue_address" defaultValue={event?.venue_address ?? ""} /></Field>
      <Field label="Link Google Maps" htmlFor="e-maps"><Input id="e-maps" type="url" name="maps_url" placeholder="https://maps.app.goo.gl/…" defaultValue={event?.maps_url ?? ""} /></Field>
      <Field label="Catatan" htmlFor="e-notes"><Textarea id="e-notes" name="notes" defaultValue={event?.notes ?? ""} /></Field>
      <FormActions><Button variant="secondary" onClick={onClose}>Batal</Button><SubmitButton>Simpan</SubmitButton></FormActions>
    </ActionForm>
  );
}
