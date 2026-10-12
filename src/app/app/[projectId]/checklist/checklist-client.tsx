"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { DateField } from "@/components/ui/date-field";
import { ArrowDown, ArrowUp, Check, ChevronDown, ListChecks, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/card";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionButton, ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { RowMenu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/components/ui/cn";
import { PHASES, TASK_CATEGORIES, TASK_PRIORITY, TASK_STATUS, labelOf } from "@/lib/constants";
import { diffDays, formatPercent, initials, todayISO } from "@/lib/format";
import { applyRecommendedChecklist, deleteTask, moveTask, saveTask, setTaskStatus } from "@/features/checklist/actions";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useI18n } from "@/i18n/client";

type Task = {
  id: string; title: string; description: string | null; category: string | null; phase_key: string; status: "todo" | "in_progress" | "done";
  priority: string; due_date: string | null; assignee_id: string | null; vendor_id: string | null; sort_order: number;
};
type Member = { id: string; name: string; avatar: string | null };

// Cincin progres kecil di kepala fase
function PhaseRing({ value }: { value: number }) {
  const r = 18, c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex size-11 shrink-0 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 44 44" className="absolute inset-0 size-11 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-plum-100" />
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-plum-600 transition-[stroke-dashoffset] duration-500" strokeDasharray={c} strokeDashoffset={c * (1 - value)} />
      </svg>
      <span className={cn("tabular font-bold tracking-tight text-plum-700", value >= 1 ? "text-[9.5px]" : "text-[11px]")}>{Math.round(value * 100)}%</span>
    </span>
  );
}

const loc = (lang: string) => (lang === "en" ? "en-GB" : "id-ID");
const asDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);
const monthLabel = (iso: string, lang: string) => new Intl.DateTimeFormat(loc(lang), { month: "long", year: "numeric", timeZone: "UTC" }).format(asDate(iso));
const monthShort = (iso: string, lang: string) => new Intl.DateTimeFormat(loc(lang), { month: "short", timeZone: "UTC" }).format(asDate(iso)).replace(".", "");
function monthRange(from: string, to: string, lang: string) {
  const a = monthLabel(from, lang), b = monthLabel(to, lang);
  if (a === b) return a;
  const first = from.slice(0, 4) === to.slice(0, 4) ? new Intl.DateTimeFormat(loc(lang), { month: "long", timeZone: "UTC" }).format(asDate(from)) : a;
  return lang === "en" ? `${first} to ${b}` : `${first} sampai ${b}`;
}
// Sisa waktu ringkas: hari untuk yang dekat, bulan atau tahun untuk yang jauh
function relativeSpan(days: number, lang: string) {
  const en = lang === "en";
  if (days < 0) return en ? `${-days} days late` : `Terlambat ${-days} hari`;
  if (days === 0) return en ? "Today" : "Hari ini";
  if (days === 1) return en ? "Tomorrow" : "Besok";
  if (days <= 45) return en ? `In ${days} days` : `${days} hari lagi`;
  if (days < 365) { const m = Math.round(days / 30); return en ? `In ${m} months` : `${m} bulan lagi`; }
  const y = Math.round(days / 365);
  return en ? `In ${y} year${y > 1 ? "s" : ""}` : `${y} tahun lagi`;
}

export function ChecklistClient({ projectId, tz, tasks, vendors, members, canWrite, hasWeddingDate }: {
  projectId: string; tz: string; tasks: Task[]; vendors: { id: string; name: string }[]; members: Member[]; canWrite: boolean; hasWeddingDate: boolean;
}) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState("");
  const [status, setStatus] = useState("");
  const [pic, setPic] = useState("");
  const [lateOnly, setLateOnly] = useState(false);
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(tasks, (state, { id, status }: { id: string; status: Task["status"] }) =>
    state.map((t) => (t.id === id ? { ...t, status } : t)));

  const today = todayISO(tz);
  const isLate = (t: Task) => t.status !== "done" && !!t.due_date && t.due_date < today;

  const filtered = useMemo(() => optimistic.filter((t) =>
    (!q || t.title.toLowerCase().includes(q.toLowerCase())) &&
    (!phase || t.phase_key === phase) &&
    (!status || t.status === status) &&
    (!pic || t.assignee_id === pic) &&
    (!lateOnly || isLate(t))), [optimistic, q, phase, status, pic, lateOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = optimistic.filter((t) => t.status === "done").length;
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  function toggle(t: Task) {
    const next = t.status === "done" ? "todo" : "done";
    start(async () => {
      setOptimistic({ id: t.id, status: next });
      await setTaskStatus(projectId, t.id, next);
    });
  }

  return (
    <>
      {optimistic.length > 0 && <ProductTour id="checklist" steps={TOURS.checklist} />}
      <PageHeader tour="checklist"
        title={t("To Do Checklist")}
        description={t("Tugas per fase menuju hari H.")}
        actions={canWrite && <Button data-tour="checklist-add" icon={<Plus />} variant="dark" onClick={() => setEditing("new")}>{t("Tambah Tugas")}</Button>}
      />

      <Card tour="checklist-progress" className="mb-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-neutral-800">{t("Progress keseluruhan")}</span>
          <span className="tabular text-[13px] text-neutral-600">{done}/{optimistic.length} · <b className="text-neutral-900">{formatPercent(optimistic.length ? done / optimistic.length : 0)}</b></span>
        </div>
        <ProgressBar value={optimistic.length ? done / optimistic.length : 0} />
        <div data-tour="checklist-filter" className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          <div className="relative col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <Input placeholder={t("Cari judul")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label={t("Cari tugas")} />
          </div>
          <Select value={phase} onChange={(e) => setPhase(e.target.value)} aria-label={t("Filter fase")}>
            <option value="">{t("Semua fase")}</option>
            {PHASES.map((p) => <option key={p.key} value={p.key}>{t(p.label)}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("Filter status")}>
            <option value="">{t("Semua status")}</option>
            {TASK_STATUS.map((s) => <option key={s.key} value={s.key}>{t(s.label)}</option>)}
          </Select>
          <Select value={pic} onChange={(e) => setPic(e.target.value)} aria-label={t("Filter penanggung jawab")}>
            <option value="">{t("Semua PIC")}</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <label className="flex h-10 items-center gap-2 rounded-md border border-neutral-200 bg-surface px-3 text-sm">
            <input type="checkbox" className="accent-plum-600" checked={lateOnly} onChange={(e) => setLateOnly(e.target.checked)} />{" "}{t("Hanya terlambat")}</label>
        </div>
      </Card>

      {optimistic.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListChecks />}
            title={t("Belum ada tugas")}
            text={t("Mulai dari checklist rekomendasi.")}
            action={canWrite && <ActionButton variant="primary" size="md" action={() => applyRecommendedChecklist(projectId)}>{t("Pakai Checklist Rekomendasi")}</ActionButton>}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {!hasWeddingDate && (
            <p className="rounded-lg bg-caution-bg px-4 py-3 text-[13px] text-caution">{t("Isi tanggal pernikahan di Pengaturan agar due date tugas rekomendasi terhitung otomatis.")}</p>
          )}
          {PHASES.map((p) => {
            const all = optimistic.filter((t) => t.phase_key === p.key);
            // Diurutkan menurut tanggal; tugas tanpa tanggal di akhir, berurutan manual
            const list = filtered.filter((t) => t.phase_key === p.key).sort((a, b) =>
              a.due_date && b.due_date ? a.due_date.localeCompare(b.due_date) || a.sort_order - b.sort_order : a.due_date ? -1 : b.due_date ? 1 : a.sort_order - b.sort_order);
            if (!list.length) return null;
            const pd = all.filter((t) => t.status === "done").length;
            const pct = all.length ? pd / all.length : 0;
            const isCollapsed = collapsed[p.key];
            const dated = all.map((t) => t.due_date).filter(Boolean).sort() as string[];
            const range = dated.length ? monthRange(dated[0]!, dated[dated.length - 1]!, lang) : null;
            const undated = list.filter((t) => !t.due_date);
            // Kelompok per bulan
            const groups: { key: string; label: string; items: Task[] }[] = [];
            for (const task of list) {
              const key = task.due_date ? task.due_date.slice(0, 7) : "none";
              let g = groups.find((x) => x.key === key);
              if (!g) groups.push((g = { key, label: task.due_date ? monthLabel(task.due_date, lang) : t("Tanpa tanggal"), items: [] }));
              g.items.push(task);
            }
            return (
              <Card key={p.key} tour={p.key === filtered[0]?.phase_key ? "checklist-phase" : undefined} className="overflow-hidden p-0 sm:p-0">
                <div data-tour={p.key === filtered[0]?.phase_key ? "checklist-phase-head" : undefined} className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
                  <PhaseRing value={pct} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900">{t(p.label)}</p>
                    {range && <p className="mt-0.5 text-[13px] text-neutral-600">{range}</p>}
                  </div>
                  <span className="hidden text-[13px] whitespace-nowrap text-neutral-600 sm:inline">
                    <b className="font-semibold text-neutral-900">{pd}</b>{" "}{t("dari {total} selesai", { total: all.length })}
                  </span>
                  <span className="tabular text-[13px] font-semibold text-neutral-700 sm:hidden">{pd}/{all.length}</span>
                  <button type="button" onClick={() => setCollapsed({ ...collapsed, [p.key]: !isCollapsed })} aria-expanded={!isCollapsed}
                    aria-label={isCollapsed ? t("Buka fase {name}", { name: t(p.label) }) : t("Tutup fase {name}", { name: t(p.label) })}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-surface text-neutral-700 transition-colors hover:border-plum-200 hover:bg-plum-50 hover:text-plum-700">
                    <ChevronDown className={cn("size-[18px] transition-transform duration-200", isCollapsed && "-rotate-90")} />
                  </button>
                </div>
                {!isCollapsed && groups.map((g) => (
                  <div key={g.key}>
                    <p className="flex min-h-[38px] items-center border-y border-neutral-100 bg-neutral-50 px-4 text-[12px] leading-none font-bold tracking-[0.08em] text-neutral-500 uppercase sm:px-5">{g.label}</p>
                    <ul data-tour={p.key === filtered[0]?.phase_key && g === groups[0] ? "checklist-rows" : undefined}>
                      {g.items.map((task) => {
                        const late = isLate(task);
                        const isDone = task.status === "done";
                        const days = task.due_date ? diffDays(today, task.due_date) : null;
                        const tone = isDone || days === null ? "neutral" : late ? "danger" : days <= 7 ? "caution" : "neutral";
                        const toneText = tone === "danger" ? "text-danger" : tone === "caution" ? "text-caution" : "text-neutral-700";
                        const when = isDone ? t("Selesai") : days === null ? "" : relativeSpan(days, lang);
                        const m = task.assignee_id ? memberById[task.assignee_id] : null;
                        const uIdx = undated.indexOf(task);
                        return (
                          <li key={task.id} data-row-id={task.id} className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-plum-50/70 sm:gap-4 sm:px-5">
                            <button type="button" role="checkbox" aria-checked={isDone} disabled={!canWrite} onClick={() => toggle(task)}
                              aria-label={t("Tandai {title} selesai", { title: t(task.title) })}
                              className={cn("inline-flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:cursor-default",
                                isDone ? "border-plum-600 bg-plum-600 text-white" : "border-neutral-300 hover:border-plum-400")}>
                              {isDone && <Check className="size-3.5" strokeWidth={3.2} aria-hidden="true" />}
                            </button>
                            {task.due_date ? (
                              <span className={cn("flex w-11 shrink-0 flex-col items-center rounded-xl border py-1 sm:w-[50px]",
                                tone === "danger" ? "border-danger/20 bg-danger-bg text-danger" : tone === "caution" ? "border-caution/20 bg-caution-bg text-caution" : "border-neutral-200 bg-neutral-50 text-neutral-900")}>
                                <span className="tabular text-[17px] leading-5 font-bold">{Number(task.due_date.slice(8, 10))}</span>
                                <span className={cn("text-[10.5px] font-semibold tracking-wide uppercase", tone === "neutral" && "text-neutral-600")}>{monthShort(task.due_date, lang)}</span>
                              </span>
                            ) : <span className="w-11 shrink-0 sm:w-[50px]" aria-hidden="true" />}
                            <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(task)}>
                              <span className={cn("block text-[15px] leading-[21px] font-semibold transition-colors", isDone ? "text-neutral-500 line-through decoration-neutral-300" : "text-neutral-900")}>{t(task.title)}</span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12.5px] text-neutral-600">
                                {when && <span className={cn("font-semibold sm:hidden", toneText)}>{when}</span>}
                                {task.status === "in_progress" && <StatusPill tone="caution">{t("Dikerjakan")}</StatusPill>}
                                <span className="inline-flex items-center gap-1.5">
                                  <span className={cn("size-[7px] rounded-full", task.priority === "high" ? "bg-danger" : task.priority === "medium" ? "bg-plum-400" : "bg-neutral-300")} aria-hidden="true" />
                                  {t("Prioritas {level}", { level: t(labelOf(TASK_PRIORITY, task.priority)).toLowerCase() })}
                                </span>
                                {task.category && (task.category === "Adat"
                                  ? <span className="rounded-full bg-plum-100 px-2 py-0.5 text-[11.5px] font-semibold text-plum-700">{t("Adat")}</span>
                                  : <span>{t(task.category)}</span>)}
                              </span>
                            </button>
                            {m && (
                              <span title={m.name} className="hidden size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-plum-100 text-[10px] font-semibold text-plum-700 sm:inline-flex">
                                {m.avatar ? <img src={m.avatar} alt={m.name} referrerPolicy="no-referrer" className="size-7 object-cover" /> : initials(m.name)}
                              </span>
                            )}
                            {when && <span className={cn("hidden shrink-0 text-[13px] font-semibold whitespace-nowrap sm:block", toneText)}>{when}</span>}
                            {canWrite && (
                              <RowMenu items={[
                                { label: t("Ubah"), icon: <Pencil />, onClick: () => setEditing(task) },
                                { label: t("Tandai dikerjakan"), hidden: task.status !== "todo", action: () => setTaskStatus(projectId, task.id, "in_progress") },
                                // Urutan manual hanya untuk tugas tanpa tanggal; yang bertanggal mengikuti tanggalnya
                                { label: t("Naikkan"), icon: <ArrowUp />, hidden: uIdx <= 0, action: () => moveTask(projectId, task.id, "up") },
                                { label: t("Turunkan"), icon: <ArrowDown />, hidden: uIdx < 0 || uIdx === undated.length - 1, action: () => moveTask(projectId, task.id, "down") },
                                { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus tugas ini?"), action: () => deleteTask(projectId, task.id) },
                              ]} />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </Card>
            );
          })}
          {filtered.length === 0 && <Card><p className="py-6 text-center text-[13px] text-neutral-500">{t("Tidak ada tugas yang cocok dengan filter.")}</p></Card>}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? t("Tambah Tugas") : canWrite ? t("Ubah Tugas") : t("Detail Tugas")} size="lg">
        {editing && (
          <ActionForm action={(fd) => saveTask(projectId, fd)} onSuccess={() => setEditing(null)}>
            {editing !== "new" && <input type="hidden" name="id" value={editing.id} />}
            <fieldset disabled={!canWrite} className="flex flex-col gap-4">
              <Field label={t("Judul")} htmlFor="t-title"><Input id="t-title" name="title" required defaultValue={editing !== "new" ? editing.title : ""} /></Field>
              <Field label={t("Deskripsi")} htmlFor="t-desc"><Textarea id="t-desc" name="description" defaultValue={editing !== "new" ? editing.description ?? "" : ""} /></Field>
              <FormGrid>
                <Field label={t("Fase")} htmlFor="t-phase">
                  <Select id="t-phase" name="phase_key" defaultValue={editing !== "new" ? editing.phase_key : "m3_1"}>
                    {PHASES.map((p) => <option key={p.key} value={p.key}>{t(p.label)}</option>)}
                  </Select>
                </Field>
                <Field label={t("Due date")} htmlFor="t-due"><DateField id="t-due" name="due_date" defaultValue={editing !== "new" ? editing.due_date ?? "" : ""} /></Field>
                <Field label={t("Kategori")} htmlFor="t-cat">
                  <Select id="t-cat" name="category" defaultValue={editing !== "new" ? editing.category ?? "" : ""}>
                    <option value="">{t("Tanpa kategori")}</option>
                    {TASK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label={t("Prioritas")} htmlFor="t-prio">
                  <Select id="t-prio" name="priority" defaultValue={editing !== "new" ? editing.priority : "medium"}>
                    {TASK_PRIORITY.map((p) => <option key={p.key} value={p.key}>{t(p.label)}</option>)}
                  </Select>
                </Field>
                <Field label={t("Status")} htmlFor="t-status">
                  <Select id="t-status" name="status" defaultValue={editing !== "new" ? editing.status : "todo"}>
                    {TASK_STATUS.map((s) => <option key={s.key} value={s.key}>{t(s.label)}</option>)}
                  </Select>
                </Field>
                <Field label={t("Penanggung jawab")} htmlFor="t-pic">
                  <Select id="t-pic" name="assignee_id" defaultValue={editing !== "new" ? editing.assignee_id ?? "" : ""}>
                    <option value="">{t("Belum ditentukan")}</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                </Field>
                <Field label={t("Vendor terkait")} htmlFor="t-vendor" className="sm:col-span-2">
                  <Select id="t-vendor" name="vendor_id" defaultValue={editing !== "new" ? editing.vendor_id ?? "" : ""}>
                    <option value="">{t("Tidak ada")}</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </Select>
                </Field>
              </FormGrid>
            </fieldset>
            {canWrite && (
              <FormActions>
                <Button variant="secondary" onClick={() => setEditing(null)}>{t("Batal")}</Button>
                <SubmitButton>{t("Simpan")}</SubmitButton>
              </FormActions>
            )}
          </ActionForm>
        )}
      </Modal>
    </>
  );
}
