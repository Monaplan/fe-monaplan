"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Segmented } from "@/components/ui/tabs";
import { formatIDR, formatIDRShort } from "@/lib/format";
import { useT } from "@/i18n/client";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-neutral-200 bg-surface px-3 py-2 shadow-pop">
      <p className="mb-1 border-l-2 border-plum-600 pl-2 text-xs font-medium text-neutral-500">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="tabular text-sm font-semibold text-neutral-900">
          {payload.length > 1 && <span className="mr-1 font-normal text-neutral-500">{p.name}:</span>}
          {formatIDR(p.value)}
        </p>
      ))}
    </div>
  );
}

const axis = { fontSize: 12, fill: "var(--color-neutral-500)" };

// Ringkasan pengeluaran per bulan; bulan berjalan disorot (DESIGN.md 3.3)
export function SpendingChart({ data }: { data: { month: string; actual: number; estimated: number; current: boolean }[] }) {
  const t = useT();
  const [mode, setMode] = useState<"actual" | "estimated">("actual");
  const total = data.reduce((s, d) => s + d[mode], 0);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[13px] text-neutral-500">{t("Total {v1}", { v1: formatIDRShort(total) })}</p>
        <Segmented items={[{ key: "actual", label: t("Realisasi") }, { key: "estimated", label: t("Jadwal") }]} value={mode} onChange={setMode} />
      </div>
      <div className="h-56" role="img" aria-label={t("Grafik pengeluaran per bulan, total {formatIDR}", { formatIDR: formatIDR(total) })}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="barDefault" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--color-plum-200)" }} />
                <stop offset="100%" style={{ stopColor: "var(--color-plum-50)" }} />
              </linearGradient>
              <linearGradient id="barActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--color-plum-600)" }} />
                <stop offset="100%" style={{ stopColor: "var(--color-plum-600)", stopOpacity: 0.15 }} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-neutral-200)" strokeDasharray="4 4" />
            <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => formatIDRShort(v).replace("Rp ", "")} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-plum-50)" }} />
            <Bar dataKey={mode} name={mode === "actual" ? "Realisasi" : "Jadwal"} radius={[8, 8, 8, 8]} maxBarSize={36}>
              {data.map((d) => <Cell key={d.month} fill={d.current ? "url(#barActive)" : "url(#barDefault)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryChart({ data }: { data: { name: string; estimated: number; actual: number }[] }) {
  const t = useT();
  return (
    <div className="h-64" role="img" aria-label={t("Grafik estimasi dan realisasi per kategori")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-neutral-200)" strokeDasharray="4 4" />
          <XAxis dataKey="name" tick={{ ...axis, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
          <YAxis tick={axis} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => formatIDRShort(v).replace("Rp ", "")} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-plum-50)" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: "var(--color-neutral-600)" }}>{v}</span>} />
          <Bar dataKey="estimated" name="Estimasi" fill="var(--color-plum-200)" radius={[6, 6, 0, 0]} maxBarSize={24} />
          <Bar dataKey="actual" name="Realisasi" fill="var(--color-plum-600)" radius={[6, 6, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
