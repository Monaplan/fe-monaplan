import type { RsvpOrnament } from "@/content/rsvp-themes";

// Hiasan SVG inline untuk tema undangan. Semua memakai currentColor / variabel tema, tanpa gambar eksternal.

const wrap = "pointer-events-none absolute text-[var(--rv-accent)]";

// Teratai kecil (padma) dari lima kelopak, dipakai di tema Bali
function Padma({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`} fill="none" stroke="currentColor" strokeWidth="1.2">
      {[-60, -30, 0, 30, 60].map((r) => <path key={r} d="M0 0C-5 -6 -5 -14 0 -20C5 -14 5 -6 0 0z" transform={`rotate(${r})`} />)}
      <circle cy="2" r="1.6" fill="currentColor" stroke="none" />
    </g>
  );
}

// Daun garis: kerangka runcing tanpa isi, supaya tetap ringan
function LeafLine({ x, y, r, s = 1 }: { x: number; y: number; r: number; s?: number }) {
  return <path d="M0 0C6 -7 6 -17 0 -26C-6 -17 -6 -7 0 0zM0 0V-22" transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} />;
}

export function Corners({ kind }: { kind: RsvpOrnament }) {
  if (kind === "hairline") {
    return <span aria-hidden="true" className="pointer-events-none absolute inset-4 border border-[var(--rv-card-border)]" />;
  }
  if (kind === "frame") {
    const Corner = ({ cls }: { cls: string }) => (
      <svg aria-hidden="true" viewBox="0 0 60 60" className={`${wrap} size-14 ${cls}`} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <path d="M4 56V18C4 10 10 4 18 4H56" />
        <path d="M14 56V26C14 19 19 14 26 14H56" opacity="0.5" />
        <path d="M18 18c4-6 11-6 11 0s-8 6-11 0z" fill="currentColor" stroke="none" opacity="0.9" />
      </svg>
    );
    return (
      <>
        <span aria-hidden="true" className="pointer-events-none absolute inset-3 border border-[var(--rv-card-border)]" />
        <Corner cls="top-1.5 left-1.5" />
        <Corner cls="top-1.5 right-1.5 -scale-x-100" />
        <Corner cls="bottom-1.5 left-1.5 -scale-y-100" />
        <Corner cls="right-1.5 bottom-1.5 scale-[-1]" />
      </>
    );
  }
  if (kind === "bali") {
    // Siku berukir dengan gulungan (ukel) dan teratai di pojok
    const Corner = ({ cls }: { cls: string }) => (
      <svg aria-hidden="true" viewBox="0 0 120 120" className={`${wrap} size-24 sm:size-32 ${cls}`} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M6 114V40C6 20 20 6 40 6H114" />
        <path d="M14 114V46C14 28 28 14 46 14H114" opacity="0.5" />
        <path d="M30 30c0-10 14-10 14 0 0 8-10 9-12 3" />
        <path d="M44 22c8-4 14 2 12 8" opacity="0.8" />
        <path d="M22 44c-4 8 2 14 8 12" opacity="0.8" />
        <path d="M62 6c0 8-8 12-14 10M6 62c8 0 12 8 10 14" opacity="0.7" />
        <g transform="translate(30 30)"><Padma s={0.55} /></g>
      </svg>
    );
    return (
      <>
        <Corner cls="top-2 left-2" />
        <Corner cls="top-2 right-2 -scale-x-100" />
        <Corner cls="bottom-2 left-2 -scale-y-100" />
        <Corner cls="bottom-2 right-2 scale-[-1]" />
      </>
    );
  }
  if (kind === "deco") {
    // Kipas siku art deco: busur sepusat dan garis jari-jari
    const Fan = ({ cls }: { cls: string }) => (
      <svg aria-hidden="true" viewBox="0 0 90 90" className={`${wrap} size-20 sm:size-28 ${cls}`} fill="none" stroke="currentColor" strokeWidth="1">
        {[18, 30, 42, 54].map((r) => <path key={r} d={`M0 ${r}A${r} ${r} 0 0 0 ${r} 0`} opacity={1 - r / 90} />)}
        {[0, 18, 36, 54, 72, 90].map((a) => {
          const rad = (a * Math.PI) / 180;
          return <path key={a} d={`M0 0L${Math.cos(rad) * 54} ${Math.sin(rad) * 54}`} opacity="0.45" />;
        })}
      </svg>
    );
    return (
      <>
        <span aria-hidden="true" className="pointer-events-none absolute inset-3 border border-[var(--rv-card-border)]" />
        <Fan cls="top-3 left-3" />
        <Fan cls="top-3 right-3 -scale-x-100" />
        <Fan cls="bottom-3 left-3 -scale-y-100" />
        <Fan cls="right-3 bottom-3 scale-[-1]" />
      </>
    );
  }
  // leaf: ranting melengkung dengan daun berselang-seling dan beberapa butir kecil, di pojok atas kiri dan bawah kanan
  const Branch = ({ cls }: { cls: string }) => (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={`${wrap} size-48 sm:size-64 ${cls}`} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M-4 14C46 20 96 50 150 126" />
      {[[22, 17, -62, 1.1], [30, 26, 70, 0.9], [50, 28, -52, 1.15], [60, 40, 62, 1], [82, 46, -44, 1.1], [90, 62, 56, 0.95], [112, 74, -34, 1], [118, 92, 48, 0.9], [136, 104, -26, 0.85], [142, 120, 40, 0.75]].map(([x, y, r, k], i) => (
        <path key={i} d="M0 0C7 -8 7 -19 0 -30C-7 -19 -7 -8 0 0zM0 0V-25" transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`} />
      ))}
      {[[156, 134], [162, 146], [152, 146]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" fill="currentColor" stroke="none" />)}
    </svg>
  );
  return (
    <>
      <Branch cls="top-0 left-0" />
      <Branch cls="right-0 bottom-0 scale-[-1]" />
    </>
  );
}

export function Divider({ kind }: { kind: RsvpOrnament }) {
  const base = "mx-auto my-4 flex w-48 items-center gap-3 text-[var(--rv-accent)]";
  const line = <span className="h-px flex-1 bg-current opacity-60" />;
  if (kind === "hairline") return <span aria-hidden="true" className="mx-auto my-5 block h-px w-12 bg-[var(--rv-ink)]" />;
  if (kind === "bali") return (<div aria-hidden="true" className={base}>{line}<svg viewBox="-24 -24 48 28" className="h-6 w-8"><Padma s={0.9} /></svg>{line}</div>);
  if (kind === "deco") return (
    <div aria-hidden="true" className={base}>
      <span className="flex flex-1 flex-col gap-[3px]"><span className="h-px bg-current opacity-70" /><span className="h-px bg-current opacity-40" /></span>
      <span className="size-2 rotate-45 border border-current" />
      <span className="flex flex-1 flex-col gap-[3px]"><span className="h-px bg-current opacity-70" /><span className="h-px bg-current opacity-40" /></span>
    </div>
  );
  if (kind === "leaf") return (<div aria-hidden="true" className={base}>{line}<svg viewBox="-12 -28 24 30" className="h-6 w-5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><LeafLine x={0} y={0} r={0} /></svg>{line}</div>);
  // frame
  return (<div aria-hidden="true" className={base}>{line}<svg viewBox="0 0 24 24" className="size-4" fill="currentColor"><path d="M12 1l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" /></svg>{line}</div>);
}
