import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, background: "linear-gradient(135deg, #A9557E, #5A2541)", color: "white", fontSize: 40, fontStyle: "italic", fontWeight: 700 }}>
        M
      </div>
    ),
    size,
  );
}
