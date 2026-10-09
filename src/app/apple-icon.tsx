import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #A9557E, #3E1A2D)", color: "white", fontSize: 112, fontStyle: "italic", fontWeight: 700 }}>
        M
      </div>
    ),
    size,
  );
}
