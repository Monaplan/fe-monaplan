import { cn } from "@/components/ui/cn";

// Maskot Monaplan, "Mona": perencana pernikahan yang ceria. Sweter plum warna merek, jepit rambut hati emas
// (hati yang sama dengan lambang), dan buku planner berlambang M di pelukannya. Digambar sebagai SVG setengah badan
// supaya bisa berdiri sendiri atau duduk di balik meja pada ilustrasi. wave = tangan kiri melambai (animasi).
// Gerak (kedip, lambai, napas) diatur di globals.css dan mati bila gerak dikurangi.
export function Mascot({ className, wave = true, title = "Mona, maskot Monaplan" }: { className?: string; wave?: boolean; title?: string }) {
  return (
    <svg viewBox="0 0 240 260" role="img" aria-label={title} className={cn("mona", className)}>
      <defs>
        <linearGradient id="mona-sweater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B8638D" /><stop offset="1" stopColor="#97476F" /></linearGradient>
        <linearGradient id="mona-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7A4C35" /><stop offset="1" stopColor="#5E3826" /></linearGradient>
        <radialGradient id="mona-skin" cx="0.45" cy="0.4" r="0.7"><stop offset="0" stopColor="#FCE0C8" /><stop offset="1" stopColor="#F2C7A6" /></radialGradient>
        <linearGradient id="mona-book" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8C3A63" /><stop offset="1" stopColor="#5A2541" /></linearGradient>
      </defs>

      <g className="mona-body">
        {/* Rambut belakang, panjang bergelombang sampai bahu */}
        <path d="M54 118C44 60 82 24 120 24s76 36 66 94c8 34 4 66-8 86-6 10-14 6-16-2H78c-2 8-10 12-16 2-12-20-16-52-8-86z" fill="url(#mona-hair)" />

        {/* Badan dan sweter kerah tinggi */}
        <path d="M56 260c0-48 26-74 64-74s64 26 64 74z" fill="url(#mona-sweater)" />
        <path d="M120 200c-10 0-18-4-22-10l4-12h36l4 12c-4 6-12 10-22 10z" fill="#C97BA0" />
        {[0, 1, 2].map((i) => <path key={i} d={`M101 ${184 + i * 5}h38`} stroke="#B0628A" strokeWidth="1.6" strokeLinecap="round" />)}
        <rect x="108" y="156" width="24" height="26" rx="8" fill="#EDBF9C" />

        {/* Kepala */}
        <circle cx="66" cy="122" r="9" fill="#F2C7A6" /><circle cx="174" cy="122" r="9" fill="#F2C7A6" />
        <ellipse cx="120" cy="114" rx="56" ry="54" fill="url(#mona-skin)" />

        {/* Poni dan helai samping */}
        <path d="M63 112c-4-46 26-68 57-68 34 0 62 22 57 70-14-16-30-28-46-34-4 14-24 26-50 24-8 2-14 6-18 8z" fill="url(#mona-hair)" />
        <path d="M64 108c-6 22-4 46 4 64 4 10-2 18-10 14 6-8 2-18-2-26-8-18-6-38 8-52z" fill="#6B412D" />
        <path d="M176 110c6 22 4 46-4 64-4 10 2 18 10 14-6-8-2-18 2-26 8-18 6-38-8-52z" fill="#6B412D" />
        <path d="M100 58c10-6 26-8 38-2" stroke="#946048" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />

        {/* Jepit rambut hati emas */}
        <path d="M160 74c-7.5-5-11-8.6-11-12.6a6 6 0 0 1 11-3.4 6 6 0 0 1 11 3.4c0 4-3.5 7.6-11 12.6z" fill="#F3C969" stroke="#D9A93E" strokeWidth="1.2" transform="rotate(18 160 64)" />

        {/* Wajah */}
        <path d="M88 104c5-4 12-4 17 0M135 104c5-4 12-4 17 0" stroke="#5E3826" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <g className="mona-eyes">
          <ellipse cx="98" cy="122" rx="8.5" ry="10.5" fill="#3A2420" />
          <ellipse cx="142" cy="122" rx="8.5" ry="10.5" fill="#3A2420" />
          <circle cx="101" cy="117" r="3.2" fill="#fff" /><circle cx="145" cy="117" r="3.2" fill="#fff" />
          <circle cx="95.5" cy="126" r="1.6" fill="#fff" opacity="0.8" /><circle cx="139.5" cy="126" r="1.6" fill="#fff" opacity="0.8" />
          <path d="M89 114l-4-3M151 114l4-3" stroke="#3A2420" strokeWidth="2" strokeLinecap="round" />
        </g>
        <ellipse cx="84" cy="140" rx="10" ry="6" fill="#F4A3B4" opacity="0.65" />
        <ellipse cx="156" cy="140" rx="10" ry="6" fill="#F4A3B4" opacity="0.65" />
        <path d="M118 132q2 3 4 0" stroke="#D99A80" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M110 142q10 11 20 0q-10 4-20 0z" fill="#B44F69" stroke="#B44F69" strokeWidth="2.4" strokeLinejoin="round" />

        {/* Buku planner dipeluk di dada, tangan kanan menahannya */}
        <g transform="rotate(-8 150 222)">
          <rect x="122" y="196" width="60" height="58" rx="8" fill="url(#mona-book)" />
          <rect x="176" y="200" width="6" height="50" rx="2" fill="#F3E3D6" />
          <path d="M140 230v-12a2 2 0 0 1 3.4-1.4L152 225l8.6-8.4A2 2 0 0 1 164 218v12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M152 214c-2.4-1.6-3.6-2.8-3.6-4.2a2 2 0 0 1 3.6-1 2 2 0 0 1 3.6 1c0 1.4-1.2 2.6-3.6 4.2z" fill="#F3C969" />
        </g>
        <path d="M168 196c10 8 14 20 8 34" stroke="url(#mona-sweater)" strokeWidth="22" strokeLinecap="round" fill="none" />
        <circle cx="172" cy="232" r="11" fill="#F2C7A6" />
      </g>

      {/* Tangan kiri melambai */}
      {wave ? (
        <g className="mona-wave" style={{ transformOrigin: "76px 214px" }}>
          <path d="M76 214c-16-12-24-34-22-58" stroke="#A9557E" strokeWidth="22" strokeLinecap="round" fill="none" />
          <ellipse cx="54" cy="142" rx="12" ry="15" fill="#F2C7A6" />
          <ellipse cx="66" cy="148" rx="4.5" ry="7.5" fill="#F2C7A6" transform="rotate(35 66 148)" />
          <path d="M49 132v8M55 130v9M61 132v8" stroke="#E2AE8C" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      ) : (
        <path d="M70 208c-8 14-8 30-2 46" stroke="#A9557E" strokeWidth="22" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}
