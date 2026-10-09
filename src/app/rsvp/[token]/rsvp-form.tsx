"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, CircleHelp, CircleX, Heart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { cn } from "@/components/ui/cn";

type Status = "hadir" | "tidak_hadir" | "ragu";
const OPTIONS: { key: Status; label: string; icon: React.ReactNode }[] = [
  { key: "hadir", label: "Hadir", icon: <CircleCheck /> },
  { key: "tidak_hadir", label: "Tidak Hadir", icon: <CircleX /> },
  { key: "ragu", label: "Masih Ragu", icon: <CircleHelp /> },
];

export function RsvpForm({ token, paxMax, initial }: { token: string; paxMax: number; initial: { status: string; pax: number; message: string } | null }) {
  const [status, setStatus] = useState<Status | null>((initial?.status as Status) ?? null);
  const [pax, setPax] = useState(Math.min(initial?.pax ?? 1, paxMax));
  const [message, setMessage] = useState(initial?.message ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(!!initial);

  async function submit() {
    if (!status) return setError("Pilih salah satu jawaban dulu, ya.");
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/rsvp/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, pax: status === "hadir" ? pax : 0, message }),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(j.message ?? "Gagal menyimpan. Coba lagi, ya.");
    setDone(true);
  }

  if (done) {
    return (
      <div className="py-4 text-center">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-plum-100 text-plum-600"><Heart className="size-7" /></span>
        <p className="mt-3 text-lg font-semibold">Terima kasih atas konfirmasinya!</p>
        <p className="mt-1 text-sm text-neutral-600">
          {status === "hadir" ? `Kami menantikan kehadiran ${pax} orang.` : status === "tidak_hadir" ? "Terima kasih atas doa dan restunya." : "Kabari kami lagi bila sudah pasti, ya."}
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => setDone(false)}>Ubah jawaban</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-semibold">Apakah kamu akan hadir?</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup">
        {OPTIONS.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={status === o.key} onClick={() => setStatus(o.key)}
            className={cn("flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border p-2 text-[13px] font-medium transition-colors [&_svg]:size-6",
              status === o.key ? "border-2 border-plum-600 bg-plum-50 text-plum-700" : "border-neutral-200 text-neutral-700 hover:bg-neutral-50")}>
            {o.icon}{o.label}
          </button>
        ))}
      </div>
      {status === "hadir" && (
        <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
          <span className="text-sm font-medium">Jumlah orang <span className="text-xs text-neutral-500">(maks {paxMax})</span></span>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Kurangi" disabled={pax <= 1} onClick={() => setPax(pax - 1)} className="inline-flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-surface disabled:opacity-40"><Minus className="size-4" /></button>
            <span className="tabular w-6 text-center text-lg font-semibold">{pax}</span>
            <button type="button" aria-label="Tambah" disabled={pax >= paxMax} onClick={() => setPax(pax + 1)} className="inline-flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-surface disabled:opacity-40"><Plus className="size-4" /></button>
          </div>
        </div>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Ucapan dan doa <span className="text-xs text-neutral-500">(opsional)</span></span>
        <Textarea value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} placeholder="Selamat menempuh hidup baru!" />
      </label>
      {error && <p className="flex items-center gap-2 text-[13px] text-danger"><CircleAlert className="size-4" />{error}</p>}
      <Button size="lg" className="w-full" loading={loading} onClick={submit}>Kirim Konfirmasi</Button>
    </div>
  );
}
