"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { DateField } from "@/components/ui/date-field";
import { ArrowDown, ArrowUp, ChevronDown, ListChecks, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { PHASES, TASK_CATEGORIES, TASK_PRIORITY, TASK_STATUS } from "@/lib/constants";
import { formatDateCompact, formatPercent, initials, relativeDay, todayISO } from "@/lib/format";
import { applyRecommendedChecklist, deleteTask, moveTask, saveTask, setTaskStatus } from "@/features/checklist/actions";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useI18n } from "@/i18n/client";

type Task = {
  id: string; title: string; description: string | null; category: string | null; phase_key: string; status: "todo" | "in_progress" | "done";
  priority: string; due_date: string | null; assignee_id: string | null; vendor_id: string | null; sort_order: number;
};
type Member = { id: string; name: string; avatar: string | null };

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
      <PageHeader
        title={t("To Do Checklist")}
        description={t("Tugas per fase menuju hari H.")}
        actions={canWrite && <Button data-tour="checklist-add" icon={<Plus />} variant="dark" onClick={() => setEditing("new")}>{t("Tambah Tugas")}</Button>}
      />

      <Card className="mb-4">
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
            const list = filtered.filter((t) => t.phase_key === p.key);
            if (!list.length) return null;
            const pd = all.filter((t) => t.status === "done").length;
            const isCollapsed = collapsed[p.key];
            return (
              <Card key={p.key} tour={p.key === filtered[0]?.phase_key ? "checklist-phase" : undefined} className="p-0 sm:p-0">
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left sm:px-5" onClick={() => setCollapsed({ ...collapsed, [p.key]: !isCollapsed })} aria-expanded={!isCollapsed}>
                  <ChevronDown className={cn("size-[18px] text-neutral-500 transition-transform", isCollapsed && "-rotate-90")} />
                  <span className="flex-1 font-semibold text-neutral-800">{t(p.label)}</span>
                  <span className="tabular text-[13px] text-neutral-500">{pd}/{all.length}</span>
                  <div className="hidden w-28 shrink-0 sm:block"><ProgressBar value={all.length ? pd / all.length : 0} /></div>
                </button>
                {!isCollapsed && (
                  <ul className="border-t border-neutral-200">
                    {list.map((task, idx) => {
                      const late = isLate(task);
                      const m = task.assignee_id ? memberById[task.assignee_id] : null;
                      return (
                        <li key={task.id} data-row-id={task.id} className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 last:border-b-0 hover:bg-plum-50 sm:px-5">
                          <input
                            type="checkbox"
                            className="animate-check size-[18px] shrink-0 cursor-pointer accent-plum-600 disabled:cursor-default"
                            checked={task.status === "done"}
                            disabled={!canWrite}
                            onChange={() => toggle(task)}
                            aria-label={t("Tandai {title} selesai", { title: t(task.title) })}
                          />
                          <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(task)}>
                            <span className={cn("block text-sm font-medium transition-colors", task.status === "done" ? "text-neutral-400 line-through" : "text-neutral-800")}>{t(task.title)}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              {task.due_date && (
                                <StatusPill tone={task.status === "done" ? "neutral" : late ? "danger" : "neutral"} icon={false}>
                                  {formatDateCompact(task.due_date, undefined, lang)}{task.status !== "done" && ` · ${relativeDay(task.due_date, tz, lang)}`}
                                </StatusPill>
                              )}
                              {task.status === "in_progress" && <StatusPill tone="caution">{t("Dikerjakan")}</StatusPill>}
                              {task.priority === "high" && task.status !== "done" && <StatusPill tone="positive" icon={false}>{t("Prioritas tinggi")}</StatusPill>}
                              {task.category && <span className="text-xs text-neutral-500">{t(task.category)}</span>}
                            </span>
                          </button>
                          {m && (
                            <span title={m.name} className="hidden size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-plum-100 text-[10px] font-semibold text-plum-700 sm:inline-flex">
                              {m.avatar ? <img src={m.avatar} alt={m.name} referrerPolicy="no-referrer" className="size-6 object-cover" /> : initials(m.name)}
                            </span>
                          )}
                          {canWrite && (
                            <RowMenu items={[
                              { label: t("Ubah"), icon: <Pencil />, onClick: () => setEditing(task) },
                              { label: t("Tandai dikerjakan"), hidden: task.status !== "todo", action: () => setTaskStatus(projectId, task.id, "in_progress") },
                              { label: t("Naikkan"), icon: <ArrowUp />, hidden: idx === 0, action: () => moveTask(projectId, task.id, "up") },
                              { label: t("Turunkan"), icon: <ArrowDown />, hidden: idx === list.length - 1, action: () => moveTask(projectId, task.id, "down") },
                              { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus tugas ini?"), action: () => deleteTask(projectId, task.id) },
                            ]} />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
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
