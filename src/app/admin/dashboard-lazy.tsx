"use client";

import dynamic from "next/dynamic";

// Recharts dimuat terpisah supaya halaman admin tampil dulu dan JS awal tetap kecil.
// Kerangka memuat ditulis langsung (bukan memakai ui/skeleton) agar tidak menarik modul server ke bundel klien.
const Fallback = ({ h }: { h: string }) => <div aria-hidden="true" className={`skeleton w-full rounded-xl ${h}`} />;
export const RevenueChart = dynamic(() => import("./dashboard-charts").then((m) => m.RevenueChart), { ssr: false, loading: () => <Fallback h="h-60" /> });
export const SignupsChart = dynamic(() => import("./dashboard-charts").then((m) => m.SignupsChart), { ssr: false, loading: () => <Fallback h="h-60" /> });
export const DonutChart = dynamic(() => import("./dashboard-charts").then((m) => m.DonutChart), { ssr: false, loading: () => <Fallback h="h-40" /> });
