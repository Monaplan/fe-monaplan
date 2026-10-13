// Ukuran layar iPhone untuk gambar layar pembuka (apple-touch-startup-image). Potret saja.
// [lebar CSS, tinggi CSS, rasio piksel, tinggi status bar]. Dengan statusBarStyle "default" area halaman dimulai di bawah status bar,
// jadi pusat splash HTML berada setengah tinggi status bar di bawah tengah layar; gambar pembuka mengikutinya.
export type IphoneScreen = [number, number, number, number];
export const IPHONE_SCREENS: IphoneScreen[] = [
  [440, 956, 3, 62], [430, 932, 3, 59], [428, 926, 3, 47], [420, 912, 3, 62], [414, 896, 3, 44], [414, 896, 2, 48], [414, 736, 3, 20],
  [402, 874, 3, 62], [393, 852, 3, 59], [390, 844, 3, 47], [375, 812, 3, 44], [375, 667, 2, 20], [320, 568, 2, 20],
];

export const screenId = ([w, h, r]: IphoneScreen) => `${w}x${h}@${r}`;

// Satu gambar per ukuran (terang, sama dengan tema bawaan). Media query prefers-color-scheme tidak andal di iOS, jadi tidak dipakai
export function startupImages() {
  return IPHONE_SCREENS.map((s) => {
    const [w, h, r] = s;
    const media = `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`;
    return { url: `/pwa-splash/${screenId(s)}`, media };
  });
}
