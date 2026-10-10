import { ImageResponse } from "next/og";

export const alt = "Monaplan: aplikasi wedding planner digital untuk calon pengantin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Gambar pratinjau saat tautan dibagikan di WhatsApp, Instagram, X, dan mesin pencari
export default function OpengraphImage() {
  const chips = ["Checklist", "Budget", "Vendor", "Tamu & RSVP", "Rundown", "Dokumen"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, color: "white", background: "radial-gradient(circle at 0% 0%, #A9557E 0%, transparent 55%), linear-gradient(160deg, #3E1A2D 0%, #26101C 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width={64} height={64} viewBox="0 0 48 48"><rect width="48" height="48" rx="13.5" fill="#FFFFFF" /><path d="M13 36V20.2a3.3 3.3 0 0 1 5.7-2.3L24 24.2l5.3-6.3A3.3 3.3 0 0 1 35 20.2V36" fill="none" stroke="#3E1A2D" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M24 17.6c-3.9-2.5-5.7-4.4-5.7-6.6a3.1 3.1 0 0 1 5.7-1.7 3.1 3.1 0 0 1 5.7 1.7c0 2.2-1.8 4.1-5.7 6.6z" fill="#B8638D" /></svg>
          <div style={{ fontSize: 40, fontWeight: 700 }}>Monaplan</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, letterSpacing: 4, color: "#EDD1DF" }}>DIGITAL WEDDING PLANNER</div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, marginTop: 16, maxWidth: 900 }}>Atur pernikahanmu di satu aplikasi.</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {chips.map((c) => (
            <div key={c} style={{ padding: "10px 22px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", fontSize: 24 }}>{c}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
