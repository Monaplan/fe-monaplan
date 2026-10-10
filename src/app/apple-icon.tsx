import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Lambang Monaplan memenuhi kanvas (iOS memberi sudut membulat sendiri)
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <svg width={180} height={180} viewBox="0 0 48 48"><defs><linearGradient id="g" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#B8638D" /><stop offset="1" stopColor="#4A1D36" /></linearGradient></defs><rect width="48" height="48" rx="0" fill="url(#g)" /><path d="M13 36V20.2a3.3 3.3 0 0 1 5.7-2.3L24 24.2l5.3-6.3A3.3 3.3 0 0 1 35 20.2V36" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M24 17.6c-3.9-2.5-5.7-4.4-5.7-6.6a3.1 3.1 0 0 1 5.7-1.7 3.1 3.1 0 0 1 5.7 1.7c0 2.2-1.8 4.1-5.7 6.6z" fill="#F3C969" /></svg>
      </div>
    ),
    size,
  );
}
