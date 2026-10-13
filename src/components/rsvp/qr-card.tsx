"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

// Kartu "QR Masuk" di undangan (DESIGN.md 20.7). QR dibuat di peramban sebagai SVG; library dimuat hanya bila kartu tampil.
export function QrCard({ code, name, pax }: { code: string; name: string; pax: number }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const u = `${window.location.origin}/q/${code}`;
    setUrl(u);
    let alive = true;
    import("uqr").then(({ renderSVG }) => { if (alive) setSvg(renderSVG(u, { ecc: "M", border: 2, pixelSize: 8, whiteColor: "#FFFFFF", blackColor: "#1C1619" })); }).catch(() => {});
    return () => { alive = false; };
  }, [code]);

  // Simpan sebagai PNG agar mudah dibuka dari galeri saat sinyal di lokasi lemah
  function save() {
    if (!svg) return;
    const img = new Image();
    img.onload = () => {
      const size = 720, pad = 40, foot = 110;
      const c = document.createElement("canvas");
      c.width = size; c.height = size + foot;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
      ctx.fillStyle = "#1C1619"; ctx.textAlign = "center";
      ctx.font = "600 34px system-ui, sans-serif"; ctx.fillText(name.slice(0, 32), size / 2, size + 20);
      ctx.font = "26px system-ui, sans-serif"; ctx.fillStyle = "#5E5358"; ctx.fillText(`${pax} orang · kode ${code}`, size / 2, size + 64);
      const a = document.createElement("a");
      a.href = c.toDataURL("image/png"); a.download = `qr-masuk-${code}.png`; a.click();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  return (
    <div className="animate-sheet-in mt-5 rounded-[var(--rv-radius)] border border-[var(--rv-card-border)] bg-[var(--rv-soft)] p-5 text-center">
      <p className="text-[11px] font-bold tracking-widest text-[var(--rv-muted)] uppercase">QR Masuk</p>
      <div className="mx-auto mt-3 size-[200px] overflow-hidden rounded-xl bg-white p-1 [&_svg]:size-full" role="img" aria-label={`QR masuk untuk ${name}`}>
        {svg ? <span className="block size-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="block size-full animate-pulse rounded-lg bg-neutral-100" />}
      </div>
      <p className="mt-3 text-[15px] font-semibold">{name}</p>
      <p className="text-[13px] text-[var(--rv-muted)]">{pax} orang · kode <span className="tabular font-semibold tracking-wider">{code}</span></p>
      <p className="mt-2 text-[13px]">Tunjukkan QR ini ke penerima tamu.</p>
      <button type="button" onClick={save} disabled={!svg} className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--rv-card-border)] bg-[var(--rv-field)] px-4 text-sm font-medium disabled:opacity-50">
        <Download className="size-4" />Simpan ke galeri
      </button>
      {url && <span className="sr-only">{url}</span>}
    </div>
  );
}
