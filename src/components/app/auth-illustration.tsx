import { Mascot } from "./mascot";

// Ilustrasi meja perencanaan pernikahan untuk panel kiri halaman masuk: jendela lengkung, rak, catatan tertempel,
// buku planner terbuka, cangkir hangat, vas bunga, dan kotak cincin. Digambar sebagai SVG agar ringan dan tajam;
// gerak halus (uap, kilau, catatan melayang) diatur di globals.css dan mati bila gerak dikurangi.
export function AuthIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 470" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ai-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2CADB" /><stop offset="1" stopColor="#FCEEF3" /></linearGradient>
        <linearGradient id="ai-desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EBCBD6" /><stop offset="1" stopColor="#D8A7BA" /></linearGradient>
        <linearGradient id="ai-mug" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F7C5D2" /><stop offset="1" stopColor="#EBA3B8" /></linearGradient>
        <linearGradient id="ai-vase" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F6E2AE" /><stop offset="1" stopColor="#DFB660" /></linearGradient>
        <linearGradient id="ai-box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B3638B" /><stop offset="1" stopColor="#8C3A63" /></linearGradient>
        <clipPath id="ai-glass"><path d="M352 262V122a58 58 0 0 1 116 0v140z" /></clipPath>
      </defs>

      {/* Jendela lengkung */}
      <path d="M338 276V120a72 72 0 0 1 144 0v156z" fill="#E8BCCD" />
      <path d="M352 262V122a58 58 0 0 1 116 0v140z" fill="url(#ai-sky)" />
      <g clipPath="url(#ai-glass)">
        <g className="auth-cloud"><ellipse cx="380" cy="120" rx="22" ry="9" fill="#fff" /><ellipse cx="392" cy="113" rx="13" ry="9" fill="#fff" /></g>
        <g className="auth-cloud-slow"><ellipse cx="444" cy="168" rx="18" ry="7" fill="#fff" opacity="0.9" /><ellipse cx="452" cy="162" rx="10" ry="7" fill="#fff" opacity="0.9" /></g>
        <circle cx="362" cy="262" r="30" fill="#D3A4BF" /><circle cx="400" cy="270" r="26" fill="#BC86A9" /><circle cx="446" cy="258" r="32" fill="#D3A4BF" />
      </g>
      <rect x="405" y="64" width="10" height="200" fill="#E8BCCD" />
      <rect x="352" y="182" width="116" height="9" fill="#E8BCCD" />
      <rect x="326" y="270" width="168" height="14" rx="7" fill="#DDA9BE" />
      {/* Kaktus kecil di ambang jendela */}
      <path d="M440 270h28l-3 -18h-22z" fill="#F7EFE6" />
      <ellipse cx="454" cy="246" rx="10" ry="12" fill="#BC86A9" /><ellipse cx="444" cy="242" rx="5" ry="7" fill="#BC86A9" /><ellipse cx="464" cy="240" rx="5" ry="7" fill="#BC86A9" />

      {/* Rak dengan buku dan tanaman menjuntai */}
      <rect x="48" y="150" width="168" height="11" rx="5.5" fill="#DDA9BE" />
      <rect x="150" y="104" width="13" height="46" rx="3" fill="#E9A5BC" />
      <rect x="165" y="110" width="12" height="40" rx="3" fill="#F3D9A0" />
      <rect x="179" y="98" width="14" height="52" rx="3" fill="#B8638D" transform="rotate(6 186 150)" />
      <path d="M72 150l-4 -26h40l-4 26z" fill="#F7EFE6" />
      <g className="auth-sway">
        <path d="M80 126c-10 18 -6 44 -14 70M92 126c6 22 2 46 10 64" stroke="#9A5580" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {[[70, 140, -30], [66, 160, 20], [72, 178, -20], [64, 194, 30], [96, 146, 30], [100, 166, -25], [98, 184, 25]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx="9" ry="5.5" fill={i % 2 ? "#BC86A9" : "#D3A4BF"} transform={`rotate(${r} ${x} ${y})`} />
        ))}
        {[[78, 118, -40], [90, 114, 10], [100, 120, 50]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="10" ry="6" fill="#BC86A9" transform={`rotate(${r} ${x} ${y})`} />)}
      </g>

      {/* Catatan tertempel dengan hati */}
      <g transform="translate(-34 -48)"><g className="auth-float">
        <rect x="236" y="66" width="72" height="84" rx="12" fill="#E9CFE0" />
        <rect x="236" y="66" width="72" height="84" rx="12" fill="none" stroke="#DDB6CE" strokeWidth="2" />
        <circle cx="272" cy="66" r="7" fill="#C67C9F" />
        <path d="M262 92c0-6 8-8 10-2 2-6 10-4 10 2 0 6-10 11-10 11s-10-5-10-11z" fill="#E77F9F" />
        <rect x="252" y="114" width="40" height="5" rx="2.5" fill="#C9A3BC" /><rect x="252" y="126" width="28" height="5" rx="2.5" fill="#C9A3BC" />
      </g></g>

      {/* Hati kecil yang melayang pelan */}
      {([[318, 34, 1, "auth-twinkle", "#F2A7BE"], [520, 70, 0.8, "auth-twinkle-2", "#E8BE5E"], [140, 226, 0.7, "auth-twinkle-3", "#F2A7BE"]] as const).map(([x, y, s, c, fill], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path className={c} d="M0 8C-6 4-9 1-9-2.5a4.6 4.6 0 0 1 9-1.6 4.6 4.6 0 0 1 9 1.6C9 1 6 4 0 8z" fill={fill} />
        </g>
      ))}

      {/* Mona duduk di balik meja; bagian bawah badannya tertutup meja */}
      <svg x="150" y="92" width="290" height="314" viewBox="0 0 240 260" overflow="visible"><Mascot /></svg>

      {/* Meja */}
      <rect x="0" y="352" width="600" height="30" rx="15" fill="url(#ai-desk)" />
      <rect x="20" y="378" width="560" height="92" fill="#DDB0C1" />
      <rect x="20" y="378" width="560" height="8" fill="#C48FA8" opacity="0.6" />
      <rect x="250" y="398" width="100" height="40" rx="10" fill="#EBCBD6" /><circle cx="300" cy="418" r="5" fill="#A9557E" />

      {/* Vas bunga */}
      <ellipse cx="96" cy="356" rx="40" ry="6" fill="#000" opacity="0.07" />
      <path d="M78 356c-8-20-4-40 8-50h20c12 10 16 30 8 50z" fill="url(#ai-vase)" />
      <path d="M92 306c-4-24-16-40-28-50M98 306c0-30 4-46 14-60M102 306c6-20 18-32 30-38" stroke="#9A5580" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="80" cy="282" rx="7" ry="4" fill="#BC86A9" transform="rotate(-30 80 282)" /><ellipse cx="122" cy="286" rx="7" ry="4" fill="#BC86A9" transform="rotate(30 122 286)" />
      {[[64, 254, "#F6B9CB"], [112, 244, "#FFFFFF"], [132, 266, "#F6B9CB"]].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-7" rx="5.5" ry="7.5" fill={c as string} stroke="#EFA3B9" strokeWidth="0.8" transform={`rotate(${r})`} />)}
          <circle r="3.5" fill="#F2C14E" />
        </g>
      ))}

      {/* Buku planner terbuka */}
      <ellipse cx="300" cy="358" rx="112" ry="8" fill="#000" opacity="0.08" />
      <path d="M190 352l14-58h192l14 58z" fill="#8C3A63" />
      <path d="M200 348l14-50h84v50z" fill="#FFFBF6" /><path d="M302 348v-50h84l14 50z" fill="#FFF7F0" />
      <path d="M300 296v54" stroke="#E8D9CC" strokeWidth="2" />
      <rect x="232" y="309" width="38" height="6" rx="3" fill="#C67C9F" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={226 - i * 2.4} y={324 + i * 8} width="6" height="6" rx="1.5" fill={i < 2 ? "#C67C9F" : "none"} stroke="#C67C9F" strokeWidth="1.2" />
          <rect x={236 - i * 2.4} y={326 + i * 8} width={44 - i * 6} height="3" rx="1.5" fill="#E5D4DE" />
        </g>
      ))}
      <path d="M332 314c0-6 8-8 10-2 2-6 10-4 10 2 0 7-10 12-10 12s-10-5-10-12z" fill="#E77F9F" />
      <rect x="320" y="332" width="50" height="3" rx="1.5" fill="#E5D4DE" /><rect x="324" y="340" width="40" height="3" rx="1.5" fill="#E5D4DE" />
      <path d="M386 300l14 -4 6 50 -6 2z" fill="#F2C14E" opacity="0.9" />

      {/* Cangkir hangat dengan uap berbentuk hati */}
      <ellipse cx="458" cy="356" rx="34" ry="6" fill="#000" opacity="0.08" />
      <path d="M488 318c16 0 16 22 0 22" stroke="#EBA3B8" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M430 304h58v38c0 8-6 14-14 14h-30c-8 0-14-6-14-14z" fill="url(#ai-mug)" />
      <ellipse cx="459" cy="304" rx="29" ry="5" fill="#C97B8E" />
      <path d="M452 324c0-4 5-5 7-1 2-4 7-3 7 1 0 5-7 8-7 8s-7-3-7-8z" fill="#fff" />
      <g fill="none" stroke="#E7C3CF" strokeWidth="2.5" strokeLinecap="round">
        <path className="auth-steam" d="M450 290c-6-8 6-12 0-22" />
        <path className="auth-steam-2" d="M466 288c-6-8 6-12 0-22" />
      </g>
      <path className="auth-steam-heart" d="M452 254c0-5 6-6 8-1 2-5 8-4 8 1 0 6-8 10-8 10s-8-4-8-10z" fill="#F2A7BE" />

      {/* Kotak cincin */}
      <ellipse cx="540" cy="356" rx="30" ry="5" fill="#000" opacity="0.08" />
      <rect x="514" y="326" width="52" height="30" rx="7" fill="url(#ai-box)" />
      <path d="M516 326l6-26h40l6 26z" fill="#A9557E" />
      <rect x="524" y="318" width="32" height="10" rx="5" fill="#5A2541" />
      <circle cx="540" cy="316" r="11" fill="none" stroke="#E8BE5E" strokeWidth="4" />
      <path className="auth-gem" d="M534 302l6-8 6 8-6 7z" fill="#FBE9F0" stroke="#E8BFD0" strokeWidth="1" />
    </svg>
  );
}
