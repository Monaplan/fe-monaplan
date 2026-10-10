import Link from "next/link";
import { RsvpView, partnerOf } from "@/components/rsvp/rsvp-view";
import { RSVP_THEMES, RSVP_THEME_IDS, resolveRsvpTheme } from "@/content/rsvp-themes";
import { RsvpForm } from "../../[slug]/rsvp-form";

export const metadata = { title: "Contoh Undangan RSVP", robots: { index: false, follow: false } };

// Halaman contoh: data karangan, tanpa token dan tanpa data tamu sungguhan. Formulirnya tidak mengirim apa pun.
const DEMO_EVENTS = [
  { id: "akad", name: "Akad Nikah", starts_at: "2027-03-13T01:00:00.000Z", ends_at: "2027-03-13T03:00:00.000Z", venue_name: "Masjid Agung", venue_address: "Jl. Merdeka No. 10, Kota Contoh", maps_url: null, dress_code: "Putih dan krem" },
  { id: "resepsi", name: "Resepsi", starts_at: "2027-03-13T04:00:00.000Z", ends_at: "2027-03-13T07:00:00.000Z", venue_name: "Gedung Sabuga", venue_address: "Jl. Taman Sari No. 5, Kota Contoh", maps_url: null, dress_code: "Batik" },
];

export default async function RsvpExamplePage({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const theme = resolveRsvpTheme((await searchParams).tema);
  return (
    <>
      <RsvpView themeId={theme.id} partners={[partnerOf("Raka Pratama", "Raka"), partnerOf("Nadia Safira", "Nadia")]} guestName="Bapak Hendra" cover={null} coverAlt="" events={DEMO_EVENTS} tz="Asia/Jakarta">
        <RsvpForm slug="contoh" defaultName="Bapak Hendra" paxMax={3} initial={null} preview />
      </RsvpView>
      <nav aria-label="Pilih tema contoh" className="fixed inset-x-0 bottom-3 z-40 mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] gap-1 overflow-x-auto rounded-full border border-black/10 bg-white/95 p-1 shadow-lg backdrop-blur">
        {RSVP_THEME_IDS.map((id) => (
          <Link key={id} href={`/rsvp/contoh?tema=${id}`} replace aria-current={id === theme.id ? "page" : undefined}
            className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] font-medium whitespace-nowrap text-[#3D3338] transition-colors ${id === theme.id ? "bg-[#1F1B16] !text-white" : "hover:bg-black/5"}`}>
            <span aria-hidden="true" className="size-3 rounded-full border border-black/20" style={{ background: RSVP_THEMES[id].swatch[1] }} />
            {RSVP_THEMES[id].name}
          </Link>
        ))}
      </nav>
    </>
  );
}
