"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { DateField } from "@/components/ui/date-field";
import { useRouter } from "next/navigation";
import { CircleAlert, Dices, Megaphone, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { ActionForm, FormActions, SubmitButton } from "@/components/ui/action-form";
import { StatusPill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { PromoPopupCard } from "@/components/app/promo-popup";
import { formatDateCompact, formatIDR, isoDateInTz } from "@/lib/format";
import { discountOf, priceFor, promoExhausted, promoState, type Promo } from "@/lib/pricing";
import { deletePromo, savePromo, setFeatureEnabled, setPromoActive } from "@/features/admin/config-actions";
import { ProductTour } from "@/components/app/product-tour";
import { TOURS } from "@/content/tours";
import { useI18n } from "@/i18n/client";

type PlanLite = { id: string; name: string; price_idr: number };
type T = (s: string, v?: Record<string, string | number>) => string;

function status(p: Promo, masterOn: boolean, t: T, lang: "id" | "en") {
  const st = promoState(p);
  if (st.state === "inactive") return { tone: "neutral" as const, label: t("Nonaktif") };
  if (st.state !== "ended" && promoExhausted(p)) return { tone: "neutral" as const, label: t("Kuota habis") };
  if (st.state === "ended") return { tone: "neutral" as const, label: t("Berakhir") };
  if (st.state === "scheduled") return { tone: "caution" as const, label: t("Mulai {date}", { date: formatDateCompact(p.starts_at, undefined, lang) }) };
  if (!masterOn) return { tone: "caution" as const, label: t("Tertahan, fitur promo mati") };
  return { tone: "positive" as const, label: st.daysLeft !== null && st.daysLeft <= 7 ? t("Berjalan, {n} hari lagi", { n: st.daysLeft }) : t("Berjalan") };
}

const TZ = "Asia/Jakarta";
const todayJkt = () => isoDateInTz(new Date().toISOString(), TZ);
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const endOfMonth = (iso: string) => { const d = new Date(`${iso.slice(0, 8)}01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1, 0); return d.toISOString().slice(0, 10); };
const randomCode = () => Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

export function PromoClient({ enabled: initial, promos, plans, migrated, sortControl }: { enabled: boolean; promos: Promo[]; plans: PlanLite[]; migrated: boolean; sortControl?: React.ReactNode }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [enabled, setEnabled] = useState(initial);
  const [form, setForm] = useState<Promo | "new" | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => setEnabled(initial), [initial]);
  const p = form && form !== "new" ? form : null;

  // Nilai formulir yang dipakai bersama pratinjau dan ringkasan periode
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [val, setVal] = useState(20);
  const [code, setCode] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [popupOn, setPopupOn] = useState(false);
  const [pTitle, setPTitle] = useState("");
  const [pText, setPText] = useState("");
  const [pCta, setPCta] = useState("");
  const [pName, setPName] = useState("");

  function openForm(x: Promo | "new") {
    const e = x === "new" ? null : x;
    setType(e?.discount_type ?? "percent");
    setVal(e ? e.discount_value : 20);
    setCode(e?.code ?? "");
    setMaxUses(e?.max_uses != null ? String(e.max_uses) : "");
    setFrom(e?.starts_at ? isoDateInTz(e.starts_at, TZ) : "");
    setTo(e?.ends_at ? isoDateInTz(e.ends_at, TZ) : "");
    setPopupOn(!!e?.popup_enabled);
    setPTitle(e?.popup_title ?? "");
    setPText(e?.popup_text ?? "");
    setPCta(e?.popup_cta ?? "");
    setPName(e?.name ?? "");
    setForm(x);
  }

  const run = (fn: () => ReturnType<typeof setFeatureEnabled>, undo?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) { toast(res.message ?? "Tersimpan."); router.refresh(); }
      else { undo?.(); toast(res.error, "danger"); }
    });

  const preset = (kind: "today" | "7" | "30" | "month" | "open") => {
    const today = todayJkt();
    if (kind === "open") { setFrom(""); setTo(""); return; }
    setFrom(today);
    setTo(kind === "today" ? today : kind === "7" ? addDays(today, 6) : kind === "30" ? addDays(today, 29) : endOfMonth(today));
  };

  const summary = useMemo(() => {
    if (!from && !to) return t("Berlaku langsung tanpa batas waktu.");
    const days = from && to ? Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1 : null;
    const a = from ? formatDateCompact(from, undefined, lang) : t("langsung");
    const b = to ? formatDateCompact(to, undefined, lang) : t("tanpa batas");
    return days !== null && days > 0 ? t("Berlaku {from} sampai {to} ({n} hari).", { from: a, to: b, n: days }) : t("Berlaku {from} sampai {to}.", { from: a, to: b });
  }, [from, to, lang, t]);
  const badRange = !!from && !!to && to < from;

  const previewLabel = type === "percent" ? `${val || 0}%` : formatIDR(val || 0);
  const previewPlan = plans.find((pl) => !p?.plan_id || pl.id === p.plan_id) ?? plans[0];
  const previewPrice = previewPlan && val > 0
    ? { plan: previewPlan.name, original: previewPlan.price_idr, final: previewPlan.price_idr - discountOf({ discount_type: type, discount_value: val } as Promo, previewPlan.price_idr) }
    : null;
  const previewDays = to ? Math.max(0, Math.ceil((Date.parse(`${to}T23:59:59+07:00`) - Date.now()) / 86_400_000)) : null;

  return (
    <>
      <ProductTour id="admin-promo" steps={TOURS["admin-promo"]!} />
      <PageHeader tour="admin-promo" title={t("Promo")} description={t("Potongan harga otomatis atau dengan kode. Harga akhir dikirim ke Midtrans lengkap dengan baris potongan.")}
        actions={<>{sortControl}<Button variant="dark" icon={<Plus />} disabled={!migrated} onClick={() => openForm("new")}>{t("Promo Baru")}</Button></>} />

      {!migrated && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-caution-bg px-4 py-3 text-[13px] leading-5 text-caution">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />{t("Tabel promo belum ada di database. Jalankan migrasi 20261009000004_trial_promo_calendar.sql di Supabase SQL Editor, lalu muat ulang halaman ini.")}</p>
      )}

      <Card tour="admin-promo-main" className="mb-4">
        <CardHeader icon={<Tag />} title={t("Fitur promo")} subtitle={t("Bila dimatikan, semua promo berhenti dan harga kembali normal.")}
          action={<Switch label={t("Aktifkan fitur promo")} checked={enabled} disabled={pending || !migrated} onChange={(v) => { setEnabled(v); run(() => setFeatureEnabled("promo", v), () => setEnabled(!v)); }} />} />
        {plans.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {plans.map((pl) => {
              const priced = priceFor(pl, promos, enabled);
              return (
                <li key={pl.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                  <span className="text-[13px] font-medium text-neutral-800">{pl.name}</span>
                  <span className="tabular text-right text-sm">
                    {priced.promo ? (<><s className="mr-2 text-neutral-500">{formatIDR(priced.original)}</s><b>{formatIDR(priced.final)}</b></>) : <b>{formatIDR(priced.original)}</b>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-0 sm:p-0">
        {promos.length === 0 && <p className="px-5 py-10 text-center text-[13px] text-neutral-500">{t("Belum ada promo. Buat promo pertama dengan tombol di kanan atas.")}</p>}
        {promos.map((x) => {
          const s = status(x, enabled, t, lang);
          const plan = plans.find((pl) => pl.id === x.plan_id);
          return (
            <div key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-200 px-5 py-4 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium text-neutral-900">
                  {x.name}
                  {x.code && <span className="tabular rounded-md border border-dashed border-plum-300 bg-plum-50 px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-plum-800">{x.code}</span>}
                  {x.popup_enabled && <span title={t("Tampil sebagai popup")} className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500"><Megaphone className="size-3.5" />{t("Popup")}</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {plan?.name ?? (x.plan_id ? t("Paket lain") : t("Semua paket"))} · {x.starts_at ? formatDateCompact(x.starts_at, undefined, lang) : t("langsung")} {t("sampai")} {x.ends_at ? formatDateCompact(x.ends_at, undefined, lang) : t("tanpa batas")}
                  {x.code ? ` · ${t("Hanya dengan kode")}` : ` · ${t("Otomatis")}`}
                  {x.max_uses != null ? ` · ${t("{used}/{max} terpakai", { used: x.uses ?? 0, max: x.max_uses })}` : (x.uses ? ` · ${t("{n} terpakai", { n: x.uses })}` : "")}
                </p>
              </div>
              <span className="tabular text-lg font-semibold">{x.discount_type === "percent" ? `${x.discount_value}%` : formatIDR(x.discount_value)}</span>
              <StatusPill tone={s.tone}>{s.label}</StatusPill>
              <Switch label={t("Aktifkan promo {name}", { name: x.name })} checked={x.is_active} disabled={pending} onChange={(v) => run(() => setPromoActive(x.id, v))} />
              <RowMenu items={[
                { label: t("Ubah"), icon: <Pencil />, onClick: () => openForm(x) },
                { label: t("Hapus"), icon: <Trash2 />, danger: true, confirm: t("Hapus promo \"{name}\"?", { name: x.name }), action: () => deletePromo(x.id) },
              ]} />
            </div>
          );
        })}
      </Card>
      {promos.some((x) => promoState(x).state === "live" && enabled) && (
        <p className="mt-3 text-xs text-neutral-500">{t("Bila beberapa promo berlaku sekaligus, yang memberi potongan terbesar yang dipakai. Potongan tidak menurunkan harga di bawah Rp 1.000.")}</p>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={p ? t("Ubah Promo") : t("Promo Baru")} size="lg">
        {form && (
          <ActionForm action={savePromo} onSuccess={() => { setForm(null); router.refresh(); }}>
            {p && <input type="hidden" name="id" value={p.id} />}
            <FormGrid>
              <Field label={t("Nama promo")} htmlFor="pr-name"><Input id="pr-name" name="name" required value={pName} onChange={(e) => setPName(e.target.value)} placeholder={t("Promo Akhir Tahun")} /></Field>
              <Field label={t("Kode promo")} htmlFor="pr-code" help={t("Ketik sendiri, misalnya NIKAH2026. Kosongkan agar promo berlaku otomatis.")}>
                <div className="flex gap-2">
                  <Input id="pr-code" name="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} maxLength={32} placeholder={t("Tanpa kode")} className="tabular uppercase" autoCapitalize="characters" spellCheck={false} />
                  <Button variant="secondary" icon={<Dices />} onClick={() => setCode(randomCode())} aria-label={t("Buat kode acak")} title={t("Buat kode acak")} className="shrink-0 px-3" />
                </div>
              </Field>
            </FormGrid>
            <FormGrid>
              <Field label={t("Jenis potongan")} htmlFor="pr-type">
                <Select id="pr-type" name="discount_type" value={type} onChange={(e) => { setType(e.target.value as "percent" | "fixed"); setVal(e.target.value === "percent" ? 20 : 50000); }}>
                  <option value="percent">{t("Persen (%)")}</option>
                  <option value="fixed">{t("Nominal (Rp)")}</option>
                </Select>
              </Field>
              <Field label={type === "percent" ? t("Besar potongan (%)") : t("Besar potongan")} htmlFor="pr-val">
                {type === "percent"
                  ? <Input id="pr-val" name="discount_value" type="number" min={1} max={100} step={1} required value={val} onChange={(e) => setVal(Number(e.target.value))} />
                  : <CurrencyInput key="fixed" id="pr-val" name="discount_value" defaultValue={val} required onValueChange={setVal} />}
              </Field>
              <Field label={t("Berlaku untuk")} htmlFor="pr-plan">
                <Select id="pr-plan" name="plan_id" defaultValue={p?.plan_id ?? ""}>
                  <option value="">{t("Semua paket")}</option>
                  {plans.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                </Select>
              </Field>
              <Field label={t("Batas pemakaian")} htmlFor="pr-max" help={p?.uses ? t("Sudah terpakai {n} kali. Kosongkan untuk tanpa batas.", { n: p.uses }) : t("Berapa kali promo boleh dipakai di semua pengguna. Kosongkan untuk tanpa batas.")}>
                <Input id="pr-max" name="max_uses" type="number" min={1} max={1000000} step={1} inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder={t("Tanpa batas")} />
              </Field>
            </FormGrid>

            <fieldset className="rounded-xl border border-neutral-200 p-4">
              <legend className="px-1 text-[13px] font-medium text-neutral-800">{t("Periode promo")}</legend>
              <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={t("Pilihan cepat")}>
                {([["today", t("Hari ini")], ["7", t("7 hari")], ["30", t("30 hari")], ["month", t("Sampai akhir bulan")], ["open", t("Tanpa batas")]] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => preset(k)} className="h-10 rounded-full bg-neutral-100 px-3.5 text-[13px] md:h-8 md:px-3 font-medium text-neutral-700 hover:bg-neutral-200">{label}</button>
                ))}
              </div>
              <FormGrid>
                <Field label={t("Mulai")} htmlFor="pr-from"><DateField id="pr-from" name="starts_at" value={from} onChange={setFrom} /></Field>
                <Field label={t("Berakhir")} htmlFor="pr-to" error={badRange ? t("Tanggal berakhir harus setelah tanggal mulai.") : null}><DateField id="pr-to" name="ends_at" value={to} min={from || undefined} onChange={setTo} /></Field>
              </FormGrid>
              <p className="mt-3 text-[13px] text-neutral-600" aria-live="polite">{summary}</p>
            </fieldset>

            <fieldset className="rounded-xl border border-neutral-200 p-4">
              <legend className="px-1 text-[13px] font-medium text-neutral-800">{t("Popup promo")}</legend>
              <label className="flex items-center gap-2 text-sm"><Checkbox name="popup_enabled" checked={popupOn} onChange={(e) => setPopupOn(e.target.checked)} />{t("Tampilkan sebagai popup dari bawah layar")}</label>
              {popupOn && (
                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]">
                  <div className="flex flex-col gap-3">
                    <Field label={t("Judul popup")} htmlFor="pp-title"><Input id="pp-title" name="popup_title" value={pTitle} onChange={(e) => setPTitle(e.target.value)} maxLength={80} placeholder={pName || t("Diskon spesial untukmu")} /></Field>
                    <Field label={t("Isi singkat")} htmlFor="pp-text"><Textarea id="pp-text" name="popup_text" value={pText} onChange={(e) => setPText(e.target.value)} maxLength={200} rows={3} placeholder={t("Pakai kode promo ini sebelum periodenya berakhir.")} /></Field>
                    <FormGrid>
                      <Field label={t("Teks tombol")} htmlFor="pp-cta"><Input id="pp-cta" name="popup_cta" value={pCta} onChange={(e) => setPCta(e.target.value)} maxLength={30} placeholder={t("Pakai promo")} /></Field>
                      <Field label={t("Ditampilkan untuk")} htmlFor="pp-aud">
                        <Select id="pp-aud" name="popup_audience" defaultValue={p?.popup_audience ?? "all"}>
                          <option value="all">{t("Semua pengunjung")}</option>
                          <option value="guest">{t("Yang belum masuk")}</option>
                          <option value="no_license">{t("Pengguna tanpa akses aktif")}</option>
                          <option value="trial">{t("Pengguna trial")}</option>
                        </Select>
                      </Field>
                    </FormGrid>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-neutral-500">{t("Pratinjau")}</p>
                    <PromoPopupCard preview promo={{ id: "preview", code: code || null, title: pTitle || pName || t("Diskon spesial untukmu"), text: pText || null, cta: pCta || null, label: previewLabel, price: previewPrice, endsAt: to ? `${to}T23:59:59+07:00` : null, daysLeft: previewDays }} />
                  </div>
                </div>
              )}
            </fieldset>

            <Field label={t("Catatan")} htmlFor="pr-desc" help={t("Hanya terlihat oleh admin.")}><Textarea id="pr-desc" name="description" defaultValue={p?.description ?? ""} /></Field>
            <label className="flex items-center gap-2 text-sm"><Checkbox name="is_active" defaultChecked={p?.is_active ?? true} />{t("Aktif")}</label>
            <FormActions><Button variant="secondary" onClick={() => setForm(null)}>{t("Batal")}</Button><SubmitButton>{t("Simpan")}</SubmitButton></FormActions>
          </ActionForm>
        )}
      </Modal>
    </>
  );
}
