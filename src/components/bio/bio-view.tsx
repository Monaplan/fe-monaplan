import { ArrowRight, ArrowUpRight, AtSign, CalendarDays, Check, ChevronDown, FileText, Gift, Globe, Link2, Mail, Phone, Play, ShoppingBag, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/app/logo-mark";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/components/ui/cn";
import { BioActions } from "./bio-actions";
import { instagramUrl, whatsappLink, type ContactInfo } from "@/lib/support";
import type { BioIcon, BioLinkItem, BioNode } from "@/lib/links";

// Halaman bio link: satu desain tetap (blush dengan pola hati, ranting, dan cincin, serasi dengan background Lynk.id).
// Dipakai di /bio (publik) dan pratinjau admin. Warnanya tetap, tidak ikut mode gelap pengunjung. Hampir seluruhnya tanpa
// state: bagian dropdown memakai <details> bawaan peramban, jadi ringan dan tetap bekerja tanpa JavaScript.
const ICON: Record<BioIcon, ReactNode> = {
  link: <Link2 />, shop: <ShoppingBag />, whatsapp: <WhatsAppIcon />, instagram: <AtSign />, mail: <Mail />,
  globe: <Globe />, gift: <Gift />, calendar: <CalendarDays />, phone: <Phone />, video: <Play />, file: <FileText />,
};

const LEAVES = [[22, 17, -62, 1.1], [30, 26, 70, 0.9], [50, 28, -52, 1.15], [60, 40, 62, 1], [82, 46, -44, 1.1], [90, 62, 56, 0.95], [112, 74, -34, 1], [118, 92, 48, 0.9], [136, 104, -26, 0.85], [142, 120, 40, 0.75]] as const;
const LEAF = "M0 0C7 -8 7 -19 0 -30C-7 -19 -7 -8 0 0z";
const HEART = "M24 17.6c-3.9-2.5-5.7-4.4-5.7-6.6a3.1 3.1 0 0 1 5.7-1.7 3.1 3.1 0 0 1 5.7 1.7c0 2.2-1.8 4.1-5.7 6.6z";

// Ranting dengan daun berisi lembut (kotak 200x200)
function Branch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={cn("pointer-events-none absolute", className)}>
      <path d="M-4 14C46 20 96 50 150 126" fill="none" stroke="#8C3A63" strokeWidth="1.4" strokeLinecap="round" />
      <g fill="#8C3A63" fillOpacity=".55">
        {LEAVES.map(([x, y, r, k]) => <path key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`} d={LEAF} />)}
      </g>
    </svg>
  );
}

// Pola tipis (hati kecil, belah ketupat, titik) berulang dengan ukuran tetap, jadi tetap rapi di halaman sependek atau sepanjang apa pun.
// Cincin besar menempel di sudut kiri atas dan kanan bawah.
const TILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><g fill="#8C3A63">`
  + `<path opacity=".10" transform="translate(40 34) scale(1.15) translate(-24 -12)" d="${HEART}"/>`
  + `<path opacity=".10" transform="translate(120 114) scale(1.15) translate(-24 -12)" d="${HEART}"/>`
  + `<rect opacity=".09" x="116" y="30" width="9" height="9" transform="rotate(45 120.5 34.5)"/>`
  + `<rect opacity=".09" x="36" y="110" width="9" height="9" transform="rotate(45 40.5 114.5)"/>`
  + `<circle opacity=".08" cx="80" cy="80" r="2.6"/>`
  + `<circle opacity=".08" cx="0" cy="0" r="2.6"/><circle opacity=".08" cx="160" cy="0" r="2.6"/><circle opacity=".08" cx="0" cy="160" r="2.6"/><circle opacity=".08" cx="160" cy="160" r="2.6"/>`
  + `</g></svg>`;
const TILE = `url("data:image/svg+xml,${encodeURIComponent(TILE_SVG)}")`;

function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0" style={{ backgroundImage: TILE, backgroundSize: "140px 140px" }} />
      <span className="absolute -top-44 -left-60 size-[640px] rounded-full border-2 border-[#8C3A63]/10" />
      <span className="absolute -top-20 -left-44 size-[400px] rounded-full border-2 border-[#8C3A63]/[0.07]" />
      <span className="absolute -right-60 -bottom-44 size-[640px] rounded-full border-2 border-[#8C3A63]/10" />
      <span className="absolute -right-44 -bottom-20 size-[400px] rounded-full border-2 border-[#8C3A63]/[0.07]" />
    </div>
  );
}

export type BioLabels = { tagline: string; footer: string; emptyHint: string; featured: string };

const FOCUS = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C67C9F]";

function LinkCard({ l, href, preview, labels }: { l: BioLinkItem; href: string; preview: boolean; labels: BioLabels }) {
  const rel = preview ? {} : { rel: "noopener" };
  // Kartu ajakan: judul, deskripsi, dan satu tombol putih
  if (l.cta_label) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#8C3A63,#4A1D36)] p-4 text-white shadow-[0_8px_22px_rgba(90,37,65,.28)]">
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-[22px] font-semibold">{l.label}</p>
          {l.description && <p className="mt-1 text-[13px] leading-5 text-white/75">{l.description}</p>}
        </div>
        <a href={href} {...rel} className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13.5px] font-semibold text-[#3E1A2D] transition-colors hover:bg-[#F6E8EF]", FOCUS)}>
          {l.cta_label}<ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    );
  }
  const featured = l.is_featured;
  return (
    <a href={href} {...rel}
      className={cn("group relative flex min-h-[64px] w-full items-center gap-3 rounded-2xl p-3 text-left transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-0.5 active:translate-y-0", FOCUS,
        featured ? "bg-[linear-gradient(135deg,#8C3A63,#5A2541)] text-white shadow-[0_8px_22px_rgba(90,37,65,.30)]" : "border border-[#EDD1DF] bg-white/90 text-[#1C1619] shadow-[0_2px_10px_rgba(62,26,45,.06)] hover:bg-white hover:shadow-[0_6px_16px_rgba(62,26,45,.10)]")}>
      <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5", featured ? "bg-white/20 text-white" : "bg-[#F6E8EF] text-[#8C3A63]")} aria-hidden="true">{ICON[l.icon]}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15.5px] leading-5 font-semibold">{l.label}</span>
          {featured && <span className="inline-flex items-center gap-1 rounded-full bg-[#F3C969] px-2 py-0.5 text-[10.5px] leading-4 font-bold tracking-wide text-[#3E1A2D] uppercase"><Star className="size-3 fill-current" aria-hidden="true" />{labels.featured}</span>}
          {l.badge && <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] leading-4 font-bold tracking-wide uppercase", featured ? "bg-white/20 text-white" : "bg-[#F6E8EF] text-[#8C3A63]")}>{l.badge}</span>}
        </span>
        {l.description && <span className={cn("mt-0.5 block text-[13px] leading-5", featured ? "text-white/75" : "text-[#6F6269]")}>{l.description}</span>}
      </span>
      <ArrowUpRight className={cn("size-4 shrink-0 transition-opacity", featured ? "opacity-70 group-hover:opacity-100" : "text-[#8C3A63] opacity-45 group-hover:opacity-90")} aria-hidden="true" />
    </a>
  );
}

const HEADING = "flex items-center gap-3 text-[12px] font-semibold tracking-[0.14em] text-[#8A7B83] uppercase after:h-px after:flex-1 after:bg-[#E3D0DA]";

// tagline, footer, emptyHint, dan featured sudah diterjemahkan pemanggil (komponen ini dipakai di server dan klien, jadi tidak memanggil hook bahasa)
export function BioView({ nodes, contact, hrefFor, labels, preview = false }: { nodes: BioNode[]; contact: ContactInfo; hrefFor: (l: BioLinkItem) => string; labels: BioLabels; preview?: boolean }) {
  const chips = [
    contact.whatsapp && { key: "wa", href: whatsappLink(contact.whatsapp, "Halo, saya mau tanya soal Monaplan.")!, name: "WhatsApp", icon: <WhatsAppIcon />, ext: true },
    contact.instagram && { key: "ig", href: instagramUrl(contact.instagram), name: "Instagram", icon: <AtSign />, ext: true },
    contact.email && { key: "em", href: `mailto:${contact.email}`, name: "Email", icon: <Mail />, ext: false },
    { key: "web", href: "/", name: "Website", icon: <Globe />, ext: false },
  ].filter(Boolean) as { key: string; href: string; name: string; icon: ReactNode; ext: boolean }[];

  const empty = nodes.length === 0;
  return (
    <main className={cn("relative isolate flex w-full justify-center overflow-hidden bg-[radial-gradient(900px_700px_at_0%_0%,rgba(198,124,159,.26),transparent_65%),radial-gradient(900px_700px_at_100%_100%,rgba(140,58,99,.20),transparent_65%),linear-gradient(180deg,#FBF5F8_0%,#F6E8EF_100%)]", preview ? "min-h-[800px]" : "min-h-dvh")}>
      <Backdrop />
      <Branch className="-top-3 -left-4 -z-10 w-56 opacity-30 sm:w-72" />
      <Branch className="-right-4 -bottom-3 -z-10 w-56 rotate-180 opacity-30 sm:w-72" />

      <div className="flex w-full max-w-[480px] flex-col px-5 pt-5 pb-10">
        <div className="flex justify-end"><BioActions preview={preview} /></div>

        <div className="mt-7 flex flex-col items-center">
          <div className="relative">
            <LogoMark className="size-24 rounded-[28px] shadow-[0_12px_32px_rgba(62,26,45,.25)]" />
            <span aria-hidden="true" className="absolute -right-1.5 -bottom-1.5 inline-flex size-7 items-center justify-center rounded-full bg-[#F3C969] text-[#3E1A2D] ring-4 ring-[#FBF5F8]"><Check className="size-4" strokeWidth={3} /></span>
          </div>
          <h1 className="mt-5 text-center font-display text-[36px] leading-10 font-semibold text-[#3E1A2D]">Monaplan</h1>
          <p className="mt-2 max-w-sm text-center text-[14.5px] leading-6 text-[#5F5359]">{labels.tagline}</p>
          <ul className="mt-5 flex items-center justify-center gap-3">
            {chips.map((c) => (
              <li key={c.key}>
                {c.key === "web" && !preview
                  ? <Link href="/" aria-label={c.name} title={c.name} className={cn("inline-flex size-11 items-center justify-center rounded-full bg-white text-[#8C3A63] shadow-[0_2px_8px_rgba(62,26,45,.10)] transition-colors hover:bg-[#F6E8EF] [&_svg]:size-5", FOCUS)}>{c.icon}</Link>
                  : <a href={preview ? "#" : c.href} aria-label={c.name} title={c.name} {...(!preview && c.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={cn("inline-flex size-11 items-center justify-center rounded-full bg-white text-[#8C3A63] shadow-[0_2px_8px_rgba(62,26,45,.10)] transition-colors hover:bg-[#F6E8EF] [&_svg]:size-5", FOCUS)}>{c.icon}</a>}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {nodes.map((n) => {
            if (n.type === "link") return <LinkCard key={n.link.id} l={n.link} href={hrefFor(n.link)} preview={preview} labels={labels} />;
            if (n.links.length === 0) return null;
            const list = <div className="mt-3 flex flex-col gap-3">{n.links.map((l) => <LinkCard key={l.id} l={l} href={hrefFor(l)} preview={preview} labels={labels} />)}</div>;
            if (n.section.kind === "dropdown") {
              return (
                <details key={n.section.id} className="group mt-3">
                  <summary className={cn("flex cursor-pointer list-none items-center gap-3 rounded-lg py-1 text-[12px] font-semibold tracking-[0.14em] text-[#8A7B83] uppercase marker:hidden [&::-webkit-details-marker]:hidden", FOCUS)}>
                    <span>{n.section.title}</span><span aria-hidden="true" className="h-px flex-1 bg-[#E3D0DA]" />
                    <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  {list}
                </details>
              );
            }
            return <section key={n.section.id} className="mt-3"><h2 className={HEADING}>{n.section.title}</h2>{list}</section>;
          })}
        </div>
        {empty && preview && <p className="mt-8 text-center text-[13px] text-[#5F5359]">{labels.emptyHint}</p>}

        <p className="mt-10 text-center text-[12px] text-[#8A7B83]">
          {preview ? labels.footer : <Link href="/" className="underline-offset-2 hover:underline">{labels.footer}</Link>}
        </p>
      </div>
    </main>
  );
}
