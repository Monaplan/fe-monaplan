// Splash screen saat Monaplan dibuka dari ikon di layar utama (PWA). Modul biasa agar bisa dipakai Server Component sebagai string.
// SPLASH_HEAD dijalankan di <head> sebelum render: hanya aktif dalam mode standalone dan sekali per sesi (bukan saat pindah halaman).
// SPLASH_END dijalankan di akhir <body>: menutup splash setelah halaman selesai dimuat, minimal SPLASH_MIN_MS agar animasinya
// sempat terlihat, dan paling lama SPLASH_MAX_MS walaupun ada aset yang lambat.
const SPLASH_MIN_MS = 1100;
const SPLASH_MAX_MS = 4000;

export const SPLASH_HEAD = `(function(){try{var s=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;if(!s||sessionStorage.getItem("mp-splash"))return;sessionStorage.setItem("mp-splash","1");window.__mpSplashT=Date.now();document.documentElement.classList.add("mp-splash")}catch(e){}})()`;

export const SPLASH_END = `(function(){var r=document.documentElement;if(!r.classList.contains("mp-splash"))return;var t0=window.__mpSplashT||Date.now(),closed=false;function close(){if(closed)return;closed=true;r.classList.add("mp-splash-done");setTimeout(function(){r.classList.remove("mp-splash","mp-splash-done")},700)}function ready(){setTimeout(close,Math.max(0,${SPLASH_MIN_MS}-(Date.now()-t0)))}if(document.readyState==="complete")ready();else addEventListener("load",ready,{once:true});setTimeout(close,${SPLASH_MAX_MS})})()`;
