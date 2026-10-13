// Ukuran layar iPhone untuk gambar layar pembuka (apple-touch-startup-image): lebar dan tinggi CSS, rasio piksel. Potret saja.
export const IPHONE_SCREENS: [number, number, number][] = [
  [440, 956, 3], [430, 932, 3], [428, 926, 3], [420, 912, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3],
  [402, 874, 3], [393, 852, 3], [390, 844, 3], [375, 812, 3], [375, 667, 2], [320, 568, 2],
];

export const screenId = ([w, h, r]: [number, number, number]) => `${w}x${h}@${r}`;

// Satu gambar per ukuran (terang, sama dengan tema bawaan). Media query prefers-color-scheme tidak andal di iOS, jadi tidak dipakai
export function startupImages() {
  return IPHONE_SCREENS.flatMap((s) => {
    const [w, h, r] = s;
    const media = `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`;
    return [{ url: `/pwa-splash/${screenId(s)}`, media }];
  });
}
