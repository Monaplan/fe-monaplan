"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, CircleHelp, CircleX, Heart, Loader2, Minus, Plus } from "lucide-react";
import { cn } from "@/components/ui/cn";

type Status = "hadir" | "tidak_hadir" | "ragu";
const OPTIONS: { key: Status; label: string; icon: React.ReactNode }[] = [
  { key: "hadir", label: "Hadir", icon: <CircleCheck /> },
  { key: "tidak_hadir", label: "Tidak Hadir", icon: <CircleX /> },
  { key: "ragu", label: "Masih Ragu", icon: <CircleHelp /> },
];

const btnPrimary = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--rv-accent)] px-5 text-[15px] font-semibold text-[var(--rv-accent-ink)] shadow-sm transition-[transform,filter] hover:brightness-110 active:scale-[0.98] disabled:opacity-60";
const btnGhost = "mt-4 inline-flex h-10 items-center justify-center rounded-full border border-[var(--rv-card-border)] bg-[var(--rv-soft)] px-4 text-sm font-medium transition-transform active:scale-[0.97]";

// Formulir memakai variabel tema (--rv-*) dari pembungkus halaman. preview = tidak mengirim apa pun (halaman contoh).
export function RsvpForm({ slug, defaultName, paxMax, initial, preview }: { slug: string; defaultName: string; paxMax: number; initial: { status: string; pax: number; message: string } | null; preview?: boolean }) {
  const [name, setName] = useState(defaultName);
  const [status, setStatus] = useState<Status | null>((initial?.status as Status) ?? null);
  const [pax, setPax] = useState(Math.min(initial?.pax ?? 1, paxMax));
  const [message, setMessage] = useState(initial?.message ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(!!initial);

  async function submit() {
    if (name.trim().length < 2) return setError("Tulis namamu dulu, ya.");
    if (!status) return setError("Pilih salah satu jawaban dulu, ya.");
    setError(null);
    if (preview) return setDone(true);
    setLoading(true);
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name: name.trim(), status, pax: status === "hadir" ? pax : 0, message }),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(j.message ?? "Gagal menyimpan. Coba lagi, ya.");
    setDone(true);
  }

  if (done) {
    return (
      <div className="animate-sheet-in py-4 text-center">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-[var(--rv-soft)] text-[var(--rv-accent)]"><Heart className="size-7" /></span>
        <p className="mt-3 text-lg font-semibold">Terima kasih atas konfirmasinya!</p>
        <p className="mt-1 text-sm text-[var(--rv-muted)]">
          {status === "hadir" ? `Kami menantikan kehadiran ${pax} orang.` : status === "tidak_hadir" ? "Terima kasih atas doa dan restunya." : "Kabari kami lagi bila sudah pasti, ya."}
        </p>
        <button className={btnGhost} onClick={() => setDone(false)}>Ubah jawaban</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Namamu</span>
        <input value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap"
          className="h-11 w-full rounded-[var(--rv-radius)] border border-[var(--rv-field-border)] bg-[var(--rv-field)] px-3.5 text-sm text-[var(--rv-ink)] outline-none placeholder:text-[var(--rv-muted)]/70 focus:border-[var(--rv-accent)] focus:ring-2 focus:ring-[var(--rv-accent)]/30" />
      </label>
      <p className="text-base font-semibold">Apakah kamu akan hadir?</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Kehadiran">
        {OPTIONS.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={status === o.key} onClick={() => setStatus(o.key)}
            className={cn("flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-[var(--rv-radius)] border p-2 text-[13px] font-medium transition-[transform,background-color,border-color] active:scale-95 [&_svg]:size-6",
              status === o.key ? "border-[var(--rv-accent)] bg-[var(--rv-accent)] text-[var(--rv-accent-ink)]" : "border-[var(--rv-card-border)] bg-[var(--rv-soft)] hover:border-[var(--rv-accent)]")}>
            {o.icon}{o.label}
          </button>
        ))}
      </div>
      {status === "hadir" && (
        <div className="animate-sheet-in flex items-center justify-between rounded-[var(--rv-radius)] bg-[var(--rv-soft)] px-4 py-3">
          <span className="text-sm font-medium">Jumlah orang <span className="text-xs text-[var(--rv-muted)]">(maks {paxMax})</span></span>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Kurangi" disabled={pax <= 1} onClick={() => setPax(pax - 1)} className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--rv-card-border)] bg-[var(--rv-field)] disabled:opacity-40"><Minus className="size-4" /></button>
            <span className="tabular w-6 text-center text-lg font-semibold">{pax}</span>
            <button type="button" aria-label="Tambah" disabled={pax >= paxMax} onClick={() => setPax(pax + 1)} className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--rv-card-border)] bg-[var(--rv-field)] disabled:opacity-40"><Plus className="size-4" /></button>
          </div>
        </div>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Ucapan dan doa <span className="text-xs text-[var(--rv-muted)]">(opsional)</span></span>
        <textarea value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} placeholder="Selamat menempuh hidup baru!" rows={3}
          className="w-full resize-y rounded-[var(--rv-radius)] border border-[var(--rv-field-border)] bg-[var(--rv-field)] px-3.5 py-3 text-sm text-[var(--rv-ink)] outline-none placeholder:text-[var(--rv-muted)]/70 focus:border-[var(--rv-accent)] focus:ring-2 focus:ring-[var(--rv-accent)]/30" />
      </label>
      {error && <p role="alert" className="flex items-center gap-2 text-[13px] text-[var(--rv-danger)]"><CircleAlert className="size-4" />{error}</p>}
      <button type="button" className={btnPrimary} disabled={loading} onClick={submit}>
        {loading && <Loader2 className="size-4 animate-spin" />}Kirim Konfirmasi
      </button>
    </div>
  );
}
