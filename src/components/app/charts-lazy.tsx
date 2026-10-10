"use client";

import dynamic from "next/dynamic";

// Recharts (sekitar 100 KB terkompresi) dimuat setelah halaman tampil, bukan di JS awal.
// Kerangka memuat memakai div biasa agar tidak menarik modul server ke bundel klien.
const Fallback = ({ h }: { h: string }) => <div aria-hidden="true" className={`skeleton w-full rounded-xl ${h}`} />;
export const SpendingChart = dynamic(() => import("./charts").then((m) => m.SpendingChart), { ssr: false, loading: () => <Fallback h="h-72" /> });
export const CategoryChart = dynamic(() => import("./charts").then((m) => m.CategoryChart), { ssr: false, loading: () => <Fallback h="h-72" /> });
