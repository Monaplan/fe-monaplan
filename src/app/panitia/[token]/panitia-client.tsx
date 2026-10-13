"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { CheckinAdapter } from "@/components/app/checkin-panel";
import { useRouter } from "next/navigation";
import { CircleAlert, HandCoins } from "lucide-react";
import { HariHView } from "@/components/app/hari-h-view";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/inputs";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { GIFT_RECEIPT_KIND, PARTY_SIDE } from "@/lib/constants";
import { useT } from "@/i18n/client";
import type { DayData } from "@/lib/hari-h";

const CheckinPanel = dynamic(() => import("@/components/app/checkin-panel").then((m) => m.CheckinPanel), { ssr: false });

async function call(url: string, body?: unknown) {
  try {
    const res = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true as const, json } : { ok: false as const, error: (json.message as string) ?? "Check-in gagal. Coba lagi, ya." };
  } catch {
    return { ok: false as const, error: "Tidak bisa terhubung. Periksa sinyal, lalu coba lagi." };
  }
}

export function PanitiaClient({ token, data, canRecordGifts }: { token: string; data: DayData; canRecordGifts: boolean }) {
  const t = useT();
  const [gift, setGift] = useState(false);
  const [scan, setScan] = useState(false);
  const api = `/api/panitia/${encodeURIComponent(token)}/checkin`;
  const adapter = useMemo<CheckinAdapter>(() => ({
    list: async () => { const r = await call(api); return r.ok ? r.json.guests ?? [] : []; },
    checkin: async (code, pax) => { const r = await call(api, { action: "code", code, pax }); return r.ok ? { ok: true, result: r.json.result } : { ok: false, error: r.error }; },
    walkIn: async (name, pax) => { const r = await call(api, { action: "walkin", name, pax }); return r.ok ? { ok: true, result: r.json.result } : { ok: false, error: r.error }; },
  }), [api]);
  return (
    <>
      <HariHView
        staff
        data={data}
        checkin={data.attendance ? { open: () => setScan(true) } : null}
        header={
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-plum-100 px-2.5 py-0.5 text-[11px] font-bold tracking-widest text-plum-700 uppercase">{t("Panitia")}</span>
            <h1 className="mt-1 truncate font-display text-[26px] leading-8 font-medium text-neutral-900 italic">{data.title}</h1>
          </div>
        }
        extra={canRecordGifts ? (
          <button type="button" onClick={() => setGift(true)} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-surface p-4 text-left hover:bg-plum-50">
            <HandCoins className="size-5 text-plum-600" />
            <span className="flex-1 text-[14px] font-semibold text-neutral-900">{t("Catat amplop dan kado")}</span>
          </button>
        ) : null}
      />
      {gift && <StaffGiftForm token={token} onClose={() => setGift(false)} />}
      {scan && <CheckinPanel adapter={adapter} tz={data.tz} onClose={() => setScan(false)} />}
    </>
  );
}

type Kind = "amplop" | "transfer" | "kado";
type Side = "pria" | "wanita" | "bersama";

function StaffGiftForm({ token, onClose }: { token: string; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("amplop");
  const [side, setSide] = useState<Side>("bersama");
  const [amount, setAmount] = useState(0);
  const [item, setItem] = useState("");
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(again: boolean) {
    setError(null);
    if (!name.trim()) return setError(t("Nama pemberi wajib diisi."));
    setBusy(true);
    try {
      const res = await fetch(`/api/panitia/${encodeURIComponent(token)}/amplop`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giver_name: name.trim(), kind, side, amount_idr: kind === "kado" ? null : amount, item_name: kind === "kado" ? item.trim() : null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(t(body.message ?? "Gagal menyimpan. Coba lagi, ya."));
      toast(t("Catatan tersimpan."));
      router.refresh();
      if (!again) return onClose();
      setName(""); setAmount(0); setItem(""); setRound((n) => n + 1);
    } catch {
      setError(t("Tidak bisa terhubung. Periksa sinyal, lalu coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={t("Catat Amplop atau Kado")}>
      <form key={round} className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); submit(false); }}>
        <Field label={t("Nama pemberi")} htmlFor="pg-name"><Input id="pg-name" required maxLength={120} autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t("Jenis")}><Segmented fullWidth items={GIFT_RECEIPT_KIND.map((k) => ({ key: k.key as Kind, label: t(k.label) }))} value={kind} onChange={setKind} /></Field>
        <FormGrid>
          {kind === "kado"
            ? <Field label={t("Nama barang")} htmlFor="pg-item"><Input id="pg-item" required maxLength={200} value={item} onChange={(e) => setItem(e.target.value)} /></Field>
            : <Field label={t("Nominal")} htmlFor="pg-amount"><CurrencyInput id="pg-amount" required onValueChange={setAmount} /></Field>}
        </FormGrid>
        <Field label={t("Pihak")}><Segmented fullWidth items={PARTY_SIDE.map((s) => ({ key: s.key as Side, label: t(s.label) }))} value={side} onChange={setSide} /></Field>
        {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-bg px-3.5 py-2.5 text-[13px] leading-5 text-danger"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>{t("Batal")}</Button>
          <Button variant="outline" loading={busy} onClick={() => submit(true)}>{t("Simpan & catat lagi")}</Button>
          <Button loading={busy} onClick={() => submit(false)}>{t("Simpan")}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
