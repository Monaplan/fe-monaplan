// Splash screen saat Monaplan dibuka: dari ikon di layar utama (PWA, di halaman mana pun) dan di peramban biasa saat masuk ke ruang kerja.
// Modul biasa agar bisa dipakai Server Component sebagai string.
// SPLASH_HEAD dijalankan di <head> sebelum render: sekali per sesi tab (sessionStorage), jadi pindah halaman dan muat ulang tidak memunculkannya lagi.
// Di peramban biasa hanya untuk rute terlindungi (landing, undangan, RSVP, panitia tidak pernah kena) dan dilewati bila pengguna memilih "kurangi gerak".
// SPLASH_END dijalankan di akhir <body>: menutup splash setelah halaman selesai dimuat, minimal MIN ms agar animasinya sempat terlihat,
// dan paling lama MAX ms walaupun ada aset yang lambat. PWA memakai batas lebih longgar daripada peramban.
const PWA_MIN_MS = 1100;
const PWA_MAX_MS = 4000;
const WEB_MIN_MS = 900;
const WEB_MAX_MS = 2500;

// Awalan rute ruang kerja; selaras dengan PROTECTED di lib/supabase/proxy.ts (tanpa halaman publik)
const WEB_ROUTES = "^/(mulai|app|akun|aktivasi|onboarding|admin)(/|$)";

export const SPLASH_HEAD = `(function(){try{var s=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;var w=new RegExp("${WEB_ROUTES.replace(/\\/g, "\\\\")}").test(location.pathname);if(!(s||w)||sessionStorage.getItem("mp-splash"))return;if(!s&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;sessionStorage.setItem("mp-splash","1");window.__mpSplashT=Date.now();window.__mpSplashMin=s?${PWA_MIN_MS}:${WEB_MIN_MS};window.__mpSplashMax=s?${PWA_MAX_MS}:${WEB_MAX_MS};document.documentElement.classList.add("mp-splash")}catch(e){}})()`;

export const SPLASH_END = `(function(){var r=document.documentElement;if(!r.classList.contains("mp-splash"))return;var t0=window.__mpSplashT||Date.now(),min=window.__mpSplashMin||${PWA_MIN_MS},max=window.__mpSplashMax||${PWA_MAX_MS},closed=false;function close(){if(closed)return;closed=true;r.classList.add("mp-splash-done");setTimeout(function(){r.classList.remove("mp-splash","mp-splash-done")},700)}function ready(){setTimeout(close,Math.max(0,min-(Date.now()-t0)))}if(document.readyState==="complete")ready();else addEventListener("load",ready,{once:true});setTimeout(close,max)})()`;
