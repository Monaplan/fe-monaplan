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
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import {
  archiveProject, deleteEvent, deleteProject, inviteCollaborator, removeMember, revokeInvitation, saveEvent, updateCouple, updateCover,
  updateMemberRole, updateWeddingInfo,
} from "@/features/project/actions";
import { useI18n } from "@/i18n/client";
import { useT } from "@/i18n/client";

type Event = { id: string; type: string; name: string; starts_at: string | null; ends_at: string | null; venue_name: string | null; venue_address: string | null; maps_url: string | null; dress_code: string | null; notes: string | null; sort_order: number };
type Invitation = { id: string; email: string; role: string; expires_at: string; link: string };
type Tab = "pasangan" | "acara" | "budget" | "kolaborator" | "lainnya";

export function SettingsClient({ initialTab, project, events, members, invitations, maxCollaborators, coverUrl, canWrite, isOwner, currentUserId }: {
  initialTab: string; project: Project; events: Event[]; members: Member[]; invitations: Invitation[]; maxCollaborators: number; coverUrl: string | null;
  canWrite: boolean; isOwner: boolean; currentUserId: string;
}) {
  const { t, lang } = useI18n();
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
      <ProductTour id="pengaturan" steps={TOURS["pengaturan"]!} />
      <PageHeader tour="pengaturan" title={t("Pengaturan Pernikahan")} description={t("Pasangan, acara, budget, dan kolaborator.")} />
      <Segmented className="mb-4" value={tab} onChange={setTab} items={[
        { key: "pasangan", label: t("Pasangan") },
        { key: "acara", label: t("Acara") },
        { key: "budget", label: t("Budget dan Tamu") },
        { key: "kolaborator", label: t("Kolaborator") },
        { key: "lainnya", label: t("Lainnya") },
      ]} />

      {tab === "pasangan" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card tour="pengaturan-main">
            <CardHeader title={t("Data Pasangan")} />
            <ActionForm action={(fd) => updateCouple(pid, fd)} onSuccess={(r) => {
              if (r.ok && r.data?.slug && r.data.slug !== project.slug) router.replace(`/app/${r.data.slug}/pengaturan`);
            }}>
              <fieldset disabled={!canWrite} className="flex flex-col gap-4">
                <Field label={t("Judul proyek")} htmlFor="s-title" help={t("Tampil di dashboard dan halaman RSVP, contoh \"Raka & Nadia\".")}>
                  <Input id="s-title" name="title" defaultValue={project.title} />
                </Field>
                {project.slug && (
                  <Field label={t("Alamat ruang kerja")} htmlFor="s-slug" help={isOwner ? t("Huruf kecil, angka, dan tanda hubung. Alamat lama tetap mengarah ke sini.") : t("Hanya pemilik yang bisa mengubahnya.")}>
                    <div className="flex items-center overflow-hidden rounded-[12px] border border-neutral-200 bg-surface focus-within:border-plum-400 focus-within:ring-[3px] focus-within:ring-plum-100">
                      <span className="shrink-0 bg-neutral-50 px-3 text-sm text-neutral-500 select-none">{t("/app/")}</span>
                      <input id="s-slug" name="slug" defaultValue={project.slug} disabled={!isOwner} minLength={3} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" spellCheck={false}
                        className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none disabled:text-neutral-500" />
                    </div>
                  </Field>
                )}
                <FormGrid>
                  <Field label={t("Nama lengkap mempelai pria")} htmlFor="s-p1"><Input id="s-p1" name="partner_one_name" required defaultValue={project.partner_one_name} /></Field>
                  <Field label={t("Panggilan")} htmlFor="s-p1n"><Input id="s-p1n" name="partner_one_nickname" defaultValue={project.partner_one_nickname ?? ""} /></Field>
                  <Field label={t("Nama lengkap mempelai wanita")} htmlFor="s-p2"><Input id="s-p2" name="partner_two_name" required defaultValue={project.partner_two_name} /></Field>
                  <Field label={t("Panggilan")} htmlFor="s-p2n"><Input id="s-p2n" name="partner_two_nickname" defaultValue={project.partner_two_nickname ?? ""} /></Field>
                </FormGrid>
              </fieldset>
              {canWrite && <div className="flex justify-end"><SubmitButton>{t("Simpan")}</SubmitButton></div>}
            </ActionForm>
          </Card>
          <Card>
            <CardHeader title={t("Foto Sampul")} subtitle={t("Tampil di halaman RSVP tamu.")} />
            <div className="aspect-[4/5] overflow-hidden rounded-xl bg-plum-50">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt={t("Foto sampul")} className="size-full object-cover" />
              ) : <span className="flex size-full items-center justify-center text-plum-300"><ImagePlus className="size-10" /></span>}
            </div>
            {canWrite && (
              <div className="mt-3 flex gap-2">
                <label className="flex-1">
                  <span className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-100 text-sm font-medium hover:bg-neutral-200">
                    <ImagePlus className="size-4" />{uploading ? t("Mengunggah…") : coverUrl ? t("Ganti foto") : t("Unggah foto")}
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
                {coverUrl && <ActionButton variant="ghost" size="icon" title={t("Hapus foto")} icon={<Trash2 />} confirmText={t("Hapus foto sampul?")} action={() => updateCover(pid, null)} />}
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
                  <p className="text-[13px] text-neutral-600">{e.starts_at ? `${formatDateLong(e.starts_at, tz, lang)}, ${formatTime(e.starts_at, tz, undefined, lang)}${e.ends_at ? ` ${t("sampai")} ${formatTime(e.ends_at, tz, false, lang)}` : ""}` : t("Waktu belum diatur")}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-[13px] text-neutral-600">
                    {e.venue_name && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{e.venue_name}</span>}
                    {e.dress_code && <span className="flex items-center gap-1"><Shirt className="size-3.5" />{e.dress_code}</span>}
                  </div>
                </div>
                {canWrite && <RowMenu items={[
                  { label: t("Ubah"), icon: <Pencil />, onClick: () => setEventForm(e) },
                  { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus {name}? Rundown acara ini juga terhapus.", { name: e.name }), action: () => deleteEvent(pid, e.id) },
                ]} />}
              </div>
            </Card>
          ))}
          {events.length === 0 && <Card><p className="py-6 text-center text-[13px] text-neutral-500">{t("Belum ada acara.")}</p></Card>}
          {canWrite && <Button variant="outline" icon={<Plus />} className="self-start" onClick={() => setEventForm("new")}>{t("Tambah Acara")}</Button>}
        </div>
      )}

      {tab === "budget" && (
        <Card className="max-w-2xl">
          <ActionForm action={(fd) => updateWeddingInfo(pid, fd)} onSuccess={() => setDateChanged(false)}>
            <fieldset disabled={!canWrite} className="flex flex-col gap-4">
              <FormGrid>
                <Field label={t("Tanggal pernikahan")} htmlFor="s-date"><Input id="s-date" type="date" name="wedding_date" defaultValue={project.wedding_date ?? ""} onChange={() => setDateChanged(true)} /></Field>
                <Field label={t("Kota")} htmlFor="s-city"><Input id="s-city" name="city" defaultValue={project.city ?? ""} /></Field>
                <Field label={t("Zona waktu")} htmlFor="s-tz">
                  <Select id="s-tz" name="timezone" defaultValue={tz}>
                    <option value="Asia/Jakarta">{t("WIB (Asia/Jakarta)")}</option>
                    <option value="Asia/Makassar">{t("WITA (Asia/Makassar)")}</option>
                    <option value="Asia/Jayapura">{t("WIT (Asia/Jayapura)")}</option>
                  </Select>
                </Field>
                <Field label={t("Total budget")} htmlFor="s-budget"><CurrencyInput id="s-budget" name="total_budget_idr" defaultValue={project.total_budget_idr} /></Field>
                <Field label={t("Target jumlah tamu")} htmlFor="s-guests"><Input id="s-guests" type="number" min={0} name="guest_target" defaultValue={project.guest_target ?? ""} /></Field>
                <Field label={t("Batas waktu RSVP")} htmlFor="s-rsvp" help={t("Default H-3.")}><Input id="s-rsvp" type="date" name="rsvp_deadline" defaultValue={project.rsvp_deadline ?? ""} /></Field>
              </FormGrid>
              {dateChanged && (
                <label className="flex items-start gap-2 rounded-md bg-caution-bg px-3 py-3 text-[13px] text-caution">
                  <Checkbox name="shift_tasks" defaultChecked className="mt-0.5" />{t("Geser due date tugas dari checklist rekomendasi yang belum selesai mengikuti tanggal baru.")}</label>
              )}
            </fieldset>
            {canWrite && <div className="flex justify-end"><SubmitButton>{t("Simpan")}</SubmitButton></div>}
          </ActionForm>
        </Card>
      )}

      {tab === "kolaborator" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader title={t("Anggota")} subtitle={t("{used}/{max} kolaborator", { used: collabCount, max: maxCollaborators })} />
            <ul className="divide-y divide-neutral-200">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 py-3">
                  {m.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.profiles.avatar_url} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full object-cover" />
                  ) : <span className="inline-flex size-9 items-center justify-center rounded-full bg-plum-100 text-xs font-semibold text-plum-700">{initials(m.profiles?.full_name ?? m.profiles?.email)}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.profiles?.full_name ?? m.profiles?.email}{m.user_id === currentUserId && t("(kamu)")}</p>
                    <p className="truncate text-xs text-neutral-500">{m.profiles?.email}</p>
                  </div>
                  <StatusPill tone={m.role === "owner" ? "positive" : "neutral"} icon={false}>{t(ROLE_LABEL[m.role])}</StatusPill>
                  {m.role !== "owner" && (isOwner || m.user_id === currentUserId) && (
                    <RowMenu items={[
                      { label: t("Jadikan Editor"), hidden: !isOwner || m.role === "editor", action: () => updateMemberRole(pid, m.user_id, "editor") },
                      { label: t("Jadikan Viewer"), hidden: !isOwner || m.role === "viewer", action: () => updateMemberRole(pid, m.user_id, "viewer") },
                      { label: m.user_id === currentUserId ? "Keluar dari proyek" : "Keluarkan", icon: <UserMinus />, danger: true, confirm: t("Yakin?"), action: async () => {
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
                    <p className="text-xs text-neutral-500">{t("Menunggu · berlaku sampai {date}", { date: formatDateCompact(i.expires_at, undefined, lang) })}</p>
                  </div>
                  <StatusPill tone="caution" icon={false}>{t(ROLE_LABEL[i.role])}</StatusPill>
                  <RowMenu items={[
                    { label: t("Salin link undangan"), icon: <Copy />, onClick: () => { navigator.clipboard.writeText(i.link); toast(t("Link undangan disalin.")); } },
                    { label: t("Batalkan undangan"), icon: <Trash2 />, danger: true, action: () => revokeInvitation(pid, i.id) },
                  ]} />
                </li>
              ))}
            </ul>
          </Card>
          {isOwner ? (
            <Card>
              <CardHeader icon={<UserPlus />} title={t("Undang Kolaborator")} subtitle={t("Pasangan, orang tua, saudara, atau WO.")} />
              {collabCount >= maxCollaborators ? (
                <p className="text-[13px] text-neutral-600">{t("Kuota kolaborator sudah penuh. Keluarkan anggota atau batalkan undangan untuk mengundang orang lain.")}</p>
              ) : (
                <ActionForm action={(fd) => inviteCollaborator(pid, fd)} reset onSuccess={(r) => r.ok && setInviteLink(r.data.link)}>
                  <Field label={t("Email Google")} htmlFor="inv-email" help={t("Penerima harus masuk dengan akun Google yang memakai email ini.")}>
                    <Input id="inv-email" type="email" name="email" required placeholder="nadia@gmail.com" />
                  </Field>
                  <Field label={t("Peran")} htmlFor="inv-role">
                    <Select id="inv-role" name="role" defaultValue="editor">
                      <option value="editor">{t("Editor: bisa melihat dan mengubah data")}</option>
                      <option value="viewer">{t("Viewer: hanya bisa melihat")}</option>
                    </Select>
                  </Field>
                  <SubmitButton icon={<UserPlus />}>{t("Kirim Undangan")}</SubmitButton>
                </ActionForm>
              )}
              {inviteLink && (
                <div className="mt-4 rounded-md bg-plum-50 p-3">
                  <p className="mb-2 text-xs text-neutral-600">{t("Link undangan (berlaku 7 hari):")}</p>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteLink} className="h-9 text-xs" onFocus={(e) => e.target.select()} />
                    <Button size="sm" variant="secondary" icon={<Copy />} onClick={() => { navigator.clipboard.writeText(inviteLink); toast(t("Link disalin.")); }}>{t("Salin")}</Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card><p className="text-[13px] text-neutral-600">{t("Hanya pemilik ruang kerja yang bisa mengundang dan mengatur kolaborator.")}</p></Card>
          )}
        </div>
      )}

      {tab === "lainnya" && (
        <div className="flex max-w-2xl flex-col gap-4">
          <Card>
            <CardHeader icon={<Download />} title={t("Ekspor Data")} subtitle={t("Unduh data per modul sebagai CSV.")} />
            <div className="flex flex-wrap gap-2">
              {[["tamu", "Tamu & RSVP"], ["budget", "Budget"], ["checklist", "Checklist"], ["vendor", "Vendor"], ["rundown", "Rundown"], ["mahar", "Mahar & Seserahan"]].map(([k, l]) => (
                <ButtonLink key={k} href={`/api/export/${pid}/${k}`} prefetch={false} variant="outline" size="sm" icon={<Download />}>{t(l as string)}</ButtonLink>
              ))}
            </div>
          </Card>
          {isOwner && (
            <Card className="border-danger">
              <CardHeader title={t("Area Berbahaya")} />
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{project.archived_at ? t("Aktifkan kembali proyek") : t("Arsipkan proyek")}</p>
                    <p className="text-[13px] text-neutral-500">{t("Proyek terarsip hanya bisa dilihat dan tidak dihitung dalam batas proyek.")}</p>
                  </div>
                  <ActionButton variant="outline" size="md" icon={<Archive />} confirmText={project.archived_at ? undefined : t("Arsipkan proyek ini?")} action={() => archiveProject(pid, !project.archived_at)}>
                    {project.archived_at ? t("Aktifkan") : t("Arsipkan")}
                  </ActionButton>
                </div>
                <div className="border-t border-neutral-200 pt-4">
                  <p className="text-sm font-medium text-danger">{t("Hapus proyek")}</p>
                  <p className="mb-3 text-[13px] text-neutral-500">{t("Semua data dan berkas proyek akan dihapus permanen. Ketik")}{" "}<b>{project.title}</b>{" "}{t("untuk konfirmasi.")}</p>
                  <ActionForm action={(fd) => deleteProject(pid, fd)} onSuccess={() => router.push("/mulai")} className="sm:flex-row">
                    <Input name="confirm" placeholder={project.title} required aria-label={t("Konfirmasi nama proyek")} />
                    <SubmitButton variant="danger" icon={<Trash2 />}>{t("Hapus Permanen")}</SubmitButton>
                  </ActionForm>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      <Modal open={!!eventForm} onClose={() => setEventForm(null)} title={eventForm === "new" ? t("Tambah Acara") : t("Ubah Acara")} size="lg">
        {eventForm && <EventForm projectId={pid} tz={tz} event={eventForm === "new" ? null : eventForm} defaultDate={project.wedding_date} nextOrder={events.length + 1} onClose={() => setEventForm(null)} />}
      </Modal>
    </>
  );
}

function EventForm({ projectId, tz, event, defaultDate, nextOrder, onClose }: { projectId: string; tz: string; event: Event | null; defaultDate: string | null; nextOrder: number; onClose: () => void }) {
  const t = useT();
  const s = isoToLocalParts(event?.starts_at, tz);
  const e = isoToLocalParts(event?.ends_at, tz);
  return (
    <ActionForm action={(fd) => saveEvent(projectId, fd)} onSuccess={onClose}>
      {event && <input type="hidden" name="id" value={event.id} />}
      <input type="hidden" name="sort_order" value={event?.sort_order ?? nextOrder} />
      <FormGrid>
        <Field label={t("Jenis acara")} htmlFor="e-type">
          <Select id="e-type" name="type" defaultValue={event?.type ?? "resepsi"}>{EVENT_TYPES.map((ev) => <option key={ev.key} value={ev.key}>{t(ev.label)}</option>)}</Select>
        </Field>
        <Field label={t("Nama acara")} htmlFor="e-name"><Input id="e-name" name="name" defaultValue={event?.name} placeholder={t("Resepsi")} /></Field>
        <Field label={t("Tanggal")} htmlFor="e-date"><Input id="e-date" type="date" name="date" defaultValue={s.date || defaultDate || ""} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("Mulai")} htmlFor="e-start"><Input id="e-start" type="time" name="start_time" defaultValue={s.time} /></Field>
          <Field label={t("Selesai")} htmlFor="e-end"><Input id="e-end" type="time" name="end_time" defaultValue={e.time} /></Field>
        </div>
        <Field label={t("Nama tempat")} htmlFor="e-venue"><Input id="e-venue" name="venue_name" defaultValue={event?.venue_name ?? ""} /></Field>
        <Field label={t("Dress code")} htmlFor="e-dress"><Input id="e-dress" name="dress_code" defaultValue={event?.dress_code ?? ""} /></Field>
      </FormGrid>
      <Field label={t("Alamat")} htmlFor="e-addr"><Input id="e-addr" name="venue_address" defaultValue={event?.venue_address ?? ""} /></Field>
      <Field label={t("Link Google Maps")} htmlFor="e-maps"><Input id="e-maps" type="url" name="maps_url" placeholder="https://maps.app.goo.gl/…" defaultValue={event?.maps_url ?? ""} /></Field>
      <Field label={t("Catatan")} htmlFor="e-notes"><Textarea id="e-notes" name="notes" defaultValue={event?.notes ?? ""} /></Field>
      <FormActions><Button variant="secondary" onClick={onClose}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
    </ActionForm>
  );
}
