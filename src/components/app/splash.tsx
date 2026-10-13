import { LOGO_PATH_HEART, LOGO_PATH_M } from "./logo-mark";

// Tampilan splash (lihat lib/splash-script.ts). Tersembunyi kecuali <html> punya kelas mp-splash, jadi tidak tampil di peramban biasa.
// Animasinya CSS murni (globals.css: .mp-splash-*): kotak logo muncul, huruf M tergambar, hati berdenyut, bar terisi.
export function Splash() {
  return (
    <div id="mp-splash" aria-hidden="true">
      <div className="mp-splash-center">
        <svg viewBox="0 0 48 48" className="mp-splash-logo">
          <defs>
            <linearGradient id="mp-splash-g" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#B8638D" />
              <stop offset="1" stopColor="#4A1D36" />
            </linearGradient>
          </defs>
          <rect className="mp-splash-box" width="48" height="48" rx="13.5" fill="url(#mp-splash-g)" />
          <path className="mp-splash-m" d={LOGO_PATH_M} fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" pathLength={100} />
          <path className="mp-splash-heart" d={LOGO_PATH_HEART} fill="#F3C969" />
        </svg>
        <p className="mp-splash-name">Monaplan</p>
        <div className="mp-splash-bar"><span /></div>
      </div>
    </div>
  );
}
