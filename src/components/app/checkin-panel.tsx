"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraOff, Check, CircleAlert, Minus, Plus, ScanLine, Search, TriangleAlert, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { StatusPill } from "@/components/ui/pill";
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/components/ui/cn";
import { formatTime } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export type CheckinGuestLite = {
  id: string; name: string; category: string; group: string | null; pax_invited: number; pax_confirmed: number; rsvp_status: string;
  checkin_code: string; checked_in_at: string | null; checked_in_pax: number | null;
};
export type CheckinResultLite = { guest_id: string; name: string; already: boolean; checked_in_at: string; checked_in_pax: number | null };
type Out = { ok: true; result: CheckinResultLite } | { ok: false; error: string };
export type CheckinAdapter = {
  list: () => Promise<CheckinGuestLite[]>;
  checkin: (code: string, pax: number | null) => Promise<Out>;
  walkIn: (name: string, pax: number) => Promise<Out>;
};

type View =
  | { kind: "scan" }
  | { kind: "confirm"; guest: CheckinGuestLite | null; code: string }
  | { kind: "done"; result: CheckinResultLite }
  | { kind: "error"; message: string }
  | { kind: "walkin" };

const codeOf = (raw: string) => {
  const m = raw.trim().match(/\/q\/([A-Za-z0-9]{6,20})\/?(?:[?#].*)?$/) ?? raw.trim().match(/^([A-Za-z0-9]{6,20})$/);
  return m ? m[1]!.toUpperCase() : null;
};
const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch {} };

// Panel check-in hari H (DESIGN.md 20.7): pindai QR atau cari nama, konfirmasi jumlah orang, lalu masuk.
export function CheckinPanel({ adapter, tz, onClose }: { adapter: CheckinAdapter; tz: string; onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"pindai" | "nama">("pindai");
  const [view, setView] = useState<View>({ kind: "scan" });
  const [guests, setGuests] = useState<CheckinGuestLite[] | null>(null);
  const [changed, setChanged] = useState(false);
  const byCode = useMemo(() => new Map((guests ?? []).map((g) => [g.checkin_code, g])), [guests]);

  const reload = useCallback(() => adapter.list().then(setGuests).catch(() => setGuests([])), [adapter]);
  useEffect(() => { reload(); }, [reload]);

  const close = () => { if (changed) router.refresh(); onClose(); };

  const onScan = useCallback((raw: string) => {
    const code = codeOf(raw);
    if (!code) { buzz([60, 60, 60]); setView({ kind: "error", message: t("QR tidak dikenali.") }); return; }
    buzz(40);
    setView({ kind: "confirm", guest: byCode.get(code) ?? null, code });
  }, [byCode, t]);

  async function confirm(code: string, pax: number | null) {
    const r = await adapter.checkin(code, pax);
    if (!r.ok) { buzz([60, 60, 60]); setView({ kind: "error", message: t(r.error) }); return; }
    setChanged(true);
    buzz(r.result.already ? [60, 60, 60] : 120);
    setView({ kind: "done", result: r.result });
    setGuests((list) => list?.map((g) => g.id === r.result.guest_id ? { ...g, checked_in_at: r.result.checked_in_at, checked_in_pax: r.result.checked_in_pax } : g) ?? list);
  }

  const back = () => setView({ kind: "scan" });

  return (
    <Modal open onClose={close} title={t("Check-in Tamu")} size="lg">
      <div className="flex flex-col gap-4">
        {view.kind === "scan" && (
          <Segmented fullWidth items={[{ key: "pindai" as const, label: t("Pindai QR") }, { key: "nama" as const, label: t("Cari nama") }]} value={mode} onChange={setMode} />
        )}

        {view.kind === "scan" && mode === "pindai" && <Scanner onResult={onScan} onFallback={() => setMode("nama")} />}
        {view.kind === "scan" && mode === "nama" && (
          <NameSearch guests={guests} tz={tz} onPick={(g) => setView({ kind: "confirm", guest: g, code: g.checkin_code })} onWalkIn={() => setView({ kind: "walkin" })} />
        )}

        {view.kind === "confirm" && <ConfirmGuest guest={view.guest} code={view.code} tz={tz} onConfirm={confirm} onCancel={back} />}

        {view.kind === "done" && <Done result={view.result} tz={tz} onNext={back} />}

        {view.kind === "error" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-danger-bg px-5 py-8 text-center text-danger">
            <CircleAlert className="size-10" />
            <p className="text-[17px] font-semibold">{view.message}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={back}>{t("Pindai lagi")}</Button>
              <Button variant="outline" icon={<Search />} onClick={() => { setMode("nama"); back(); }}>{t("Cari nama")}</Button>
            </div>
          </div>
        )}

        {view.kind === "walkin" && (
          <WalkIn onCancel={back} onSubmit={async (name, pax) => {
            const r = await adapter.walkIn(name, pax);
            if (!r.ok) return r.error;
            setChanged(true); buzz(120); reload();
            setView({ kind: "done", result: r.result });
            return null;
          }} />
        )}
      </div>
    </Modal>
  );
}

function Scanner({ onResult, onFallback }: { onResult: (raw: string) => void; onFallback: () => void }) {
  const { t } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const cb = useRef(onResult);
  cb.current = onResult;
  const [state, setState] = useState<"loading" | "ready" | "denied" | "nocam">("loading");

  useEffect(() => {
    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | null = null;
    let cancelled = false;
    (async () => {
      // Library pemindai dimuat hanya saat panel ini dibuka
      const { default: QrScanner } = await import("qr-scanner");
      if (cancelled || !video.current) return;
      if (!(await QrScanner.hasCamera())) { setState("nocam"); return; }
      let fired = false;
      scanner = new QrScanner(video.current, (res: { data: string }) => {
        if (fired) return;
        fired = true;
        cb.current(res.data);
      }, { returnDetailedScanResult: true, highlightScanRegion: false, highlightCodeOutline: false, preferredCamera: "environment", maxScansPerSecond: 8 });
      try {
        await scanner.start();
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("denied");
      }
    })().catch(() => !cancelled && setState("nocam"));
    return () => { cancelled = true; scanner?.stop(); scanner?.destroy(); };
  }, []);

  if (state === "denied" || state === "nocam") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-neutral-100 px-5 py-10 text-center">
        <CameraOff className="size-9 text-neutral-500" />
        <p className="text-[15px] font-semibold text-neutral-900">{state === "denied" ? t("Izin kamera ditolak") : t("Kamera tidak tersedia")}</p>
        <p className="max-w-xs text-[13px] text-neutral-600">{state === "denied" ? t("Izinkan kamera di pengaturan peramban, atau cari tamu lewat nama.") : t("Cari tamu lewat nama sebagai gantinya.")}</p>
        <Button icon={<Search />} onClick={onFallback}>{t("Cari nama")}</Button>
      </div>
    );
  }
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl bg-neutral-900">
      <video ref={video} muted playsInline className="size-full object-cover" />
      {/* Bingkai sudut dan garis pindai */}
      <div className="pointer-events-none absolute inset-[14%]" aria-hidden="true">
        {["top-0 left-0 border-t-4 border-l-4 rounded-tl-xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl", "bottom-0 right-0 border-r-4 border-b-4 rounded-br-xl"]
          .map((c) => <span key={c} className={cn("absolute size-10 border-white", c)} />)}
        <span className="scan-line absolute inset-x-3 top-1/2 h-0.5 rounded-full bg-white/80" />
      </div>
      {state === "loading" && <p className="absolute inset-x-0 bottom-4 text-center text-[13px] text-white/80">{t("Membuka kamera…")}</p>}
      {state === "ready" && <p className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2 text-[13px] text-white/90"><ScanLine className="size-4" />{t("Arahkan ke QR tamu")}</p>}
    </div>
  );
}

function NameSearch({ guests, tz, onPick, onWalkIn }: { guests: CheckinGuestLite[] | null; tz: string; onPick: (g: CheckinGuestLite) => void; onWalkIn: () => void }) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (guests ?? []).filter((g) => (all || !g.checked_in_at) && (!s || g.name.toLowerCase().includes(s))).slice(0, 60);
  }, [guests, q, all]);
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-neutral-400" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Ketik nama tamu")} aria-label={t("Cari nama tamu")} className="h-12 pl-10 text-[16px]" />
      </div>
      <label className="flex items-center gap-2 text-[13px] text-neutral-600"><input type="checkbox" className="accent-plum-600" checked={all} onChange={(e) => setAll(e.target.checked)} />{t("Tampilkan yang sudah masuk")}</label>
      {guests === null ? <p className="py-6 text-center text-[13px] text-neutral-500">{t("Memuat daftar tamu…")}</p> : (
        <ul className="max-h-[46vh] overflow-y-auto rounded-xl border border-neutral-200">
          {list.map((g) => (
            <li key={g.id} className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-neutral-900">{g.name}</span>
                <span className="block truncate text-[12.5px] text-neutral-500">
                  {[g.group, g.category === "vip" ? "VIP" : null, g.checked_in_at ? t("Masuk {time}", { time: formatTime(g.checked_in_at, tz, false, lang) }) : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              <Button size="sm" variant={g.checked_in_at ? "outline" : "primary"} onClick={() => onPick(g)}>{g.checked_in_at ? t("Lihat") : t("Masuk")}</Button>
            </li>
          ))}
          {!list.length && <li className="px-4 py-6 text-center text-[13px] text-neutral-500">{t("Tidak ada tamu yang cocok.")}</li>}
        </ul>
      )}
      <Button variant="outline" icon={<UserPlus />} onClick={onWalkIn}>{t("Tamu tidak terdaftar")}</Button>
    </div>
  );
}

function ConfirmGuest({ guest, code, tz, onConfirm, onCancel }: { guest: CheckinGuestLite | null; code: string; tz: string; onConfirm: (code: string, pax: number | null) => Promise<void>; onCancel: () => void }) {
  const { t, lang } = useI18n();
  const [pax, setPax] = useState(guest ? (guest.pax_confirmed || guest.pax_invited || 1) : 1);
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); await onConfirm(code, guest ? pax : null); setBusy(false); };

  if (guest?.checked_in_at) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-caution-bg px-5 py-8 text-center text-caution">
        <TriangleAlert className="size-10" />
        <p className="text-[19px] font-semibold text-neutral-900">{guest.name}</p>
        <p className="text-[15px] font-medium">{t("Sudah masuk pukul {time} · {n} orang", { time: formatTime(guest.checked_in_at, tz, false, lang), n: guest.checked_in_pax ?? 0 })}</p>
        <Button variant="secondary" onClick={onCancel}>{t("Tutup")}</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-[24px] leading-8 font-semibold text-neutral-900">{guest?.name ?? t("Tamu dengan kode {code}", { code })}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[13px] text-neutral-600">
          {guest?.group && <span>{guest.group}</span>}
          {guest?.category === "vip" && <StatusPill tone="caution" icon={false}>{t("VIP")}</StatusPill>}
          {guest && guest.rsvp_status !== "hadir" && <StatusPill tone="neutral" icon={false}>{t("Belum konfirmasi hadir")}</StatusPill>}
        </div>
      </div>
      {guest && (
        <div className="flex items-center justify-center gap-5">
          <button type="button" aria-label={t("Kurangi")} onClick={() => setPax((p) => Math.max(1, p - 1))} className="inline-flex size-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 hover:bg-plum-50"><Minus className="size-5" /></button>
          <span className="tabular min-w-[110px] text-center"><b className="block text-[34px] leading-10 text-neutral-900">{pax}</b><span className="text-[13px] text-neutral-500">{t("orang datang")}</span></span>
          <button type="button" aria-label={t("Tambah")} onClick={() => setPax((p) => Math.min(50, p + 1))} className="inline-flex size-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 hover:bg-plum-50"><Plus className="size-5" /></button>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button size="lg" loading={busy} onClick={go} className="sm:flex-1">{t("Masuk")}</Button>
        <Button size="lg" variant="secondary" onClick={onCancel} className="sm:flex-1">{t("Batal")}</Button>
      </div>
    </div>
  );
}

function Done({ result, tz, onNext }: { result: CheckinResultLite; tz: string; onNext: () => void }) {
  const { t, lang } = useI18n();
  const next = useRef(onNext);
  next.current = onNext;
  // Tamu baru: kembali ke pemindai otomatis agar antrean cepat
  useEffect(() => {
    if (result.already) return;
    const id = setTimeout(() => next.current(), 1400);
    return () => clearTimeout(id);
  }, [result.already]);
  return result.already ? (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-caution-bg px-5 py-8 text-center text-caution">
      <TriangleAlert className="size-10" />
      <p className="text-[19px] font-semibold text-neutral-900">{result.name}</p>
      <p className="text-[15px] font-medium">{t("Sudah masuk pukul {time} · {n} orang", { time: formatTime(result.checked_in_at, tz, false, lang), n: result.checked_in_pax ?? 0 })}</p>
      <Button variant="secondary" onClick={onNext}>{t("Tutup")}</Button>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-plum-50 px-5 py-8 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-plum-600 text-white"><Check className="size-9" strokeWidth={3} /></span>
      <p className="text-[21px] font-semibold text-neutral-900">{result.name}</p>
      <p className="text-[15px] text-neutral-600">{t("Selamat datang · {n} orang", { n: result.checked_in_pax ?? 0 })}</p>
    </div>
  );
}

function WalkIn({ onSubmit, onCancel }: { onSubmit: (name: string, pax: number) => Promise<string | null>; onCancel: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form className="flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError(null);
      const err = await onSubmit(name, pax);
      setBusy(false);
      if (err) setError(t(err));
    }}>
      <p className="text-[15px] font-semibold text-neutral-900">{t("Tamu tidak terdaftar")}</p>
      <Input autoFocus required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Nama tamu")} aria-label={t("Nama tamu")} className="h-12 text-[16px]" />
      <div className="flex items-center gap-4">
        <span className="text-[14px] text-neutral-700">{t("Jumlah orang")}</span>
        <button type="button" aria-label={t("Kurangi")} onClick={() => setPax((p) => Math.max(1, p - 1))} className="inline-flex size-11 items-center justify-center rounded-full border border-neutral-200"><Minus className="size-4" /></button>
        <b className="tabular w-8 text-center text-[20px]">{pax}</b>
        <button type="button" aria-label={t("Tambah")} onClick={() => setPax((p) => Math.min(20, p + 1))} className="inline-flex size-11 items-center justify-center rounded-full border border-neutral-200"><Plus className="size-4" /></button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" size="lg" loading={busy} className="sm:flex-1">{t("Masukkan")}</Button>
        <Button size="lg" variant="secondary" onClick={onCancel} className="sm:flex-1">{t("Batal")}</Button>
      </div>
    </form>
  );
}
