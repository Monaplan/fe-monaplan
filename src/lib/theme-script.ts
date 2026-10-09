// Modul biasa (bukan "use client") agar nilainya bisa dipakai Server Component sebagai string.
// Mengimpor konstanta dari modul "use client" di server menghasilkan referensi client, bukan nilai,
// dan itu memicu hydration mismatch (React error #418) saat chunk JS diambil dari cache.
export const THEME_KEY = "mp-theme";

// Dijalankan di <head> sebelum render agar tidak ada kedipan tema yang salah
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;
