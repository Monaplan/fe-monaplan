"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatIDR, formatIDRShort } from "@/lib/format";
import { useT } from "@/i18n/client";

const axis = { fontSize: 12, fill: "var(--color-neutral-500)" };

function Tip({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-surface px-3 py-2 shadow-pop">
      <p className="mb-1 border-l-2 border-plum-600 pl-2 text-xs font-medium text-neutral-500">{label ?? payload[0].name}</p>
      <p className="tabular text-sm font-semibold text-neutral-900">{money ? formatIDR(payload[0].value) : payload[0].value}</p>
    </div>
  );
}

export function RevenueChart({ data }: { data: { label: string; value: number; current: boolean }[] }) {
  const t = useT();
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="h-60" role="img" aria-label={t("Grafik pendapatan 12 bulan, total {v1}", { v1: formatIDR(total) })}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="admBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style={{ stopColor: "var(--color-plum-200)" }} /><stop offset="100%" style={{ stopColor: "var(--color-plum-50)" }} /></linearGradient>
            <linearGradient id="admBarOn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style={{ stopColor: "var(--color-plum-600)" }} /><stop offset="100%" style={{ stopColor: "var(--color-plum-600)", stopOpacity: 0.2 }} /></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-neutral-200)" strokeDasharray="4 4" />
          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => formatIDRShort(v).replace("Rp ", "")} />
          <Tooltip content={<Tip money />} cursor={{ fill: "var(--color-plum-50)" }} />
          <Bar dataKey="value" radius={[8, 8, 8, 8]} maxBarSize={34} animationDuration={600}>
            {data.map((d) => <Cell key={d.label} fill={d.current ? "url(#admBarOn)" : "url(#admBar)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SignupsChart({ data }: { data: { label: string; value: number }[] }) {
  const t = useT();
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="h-60" role="img" aria-label={t("Grafik pendaftaran 30 hari, total {v1}", { v1: total })}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="admArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style={{ stopColor: "var(--color-plum-500)", stopOpacity: 0.45 }} /><stop offset="100%" style={{ stopColor: "var(--color-plum-500)", stopOpacity: 0.02 }} /></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-neutral-200)" strokeDasharray="4 4" />
          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
          <Tooltip content={<Tip />} />
          <Area type="monotone" dataKey="value" stroke="var(--color-plum-600)" strokeWidth={2} fill="url(#admArea)" animationDuration={700} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const PIE_COLORS = ["var(--color-plum-600)", "var(--color-plum-300)", "#C28A3B", "#7A9A7E", "var(--color-danger)", "var(--color-neutral-400)"];

export function DonutChart({ data, centerLabel, ariaLabel }: { data: { name: string; value: number }[]; centerLabel: string; ariaLabel: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="py-10 text-center text-[13px] text-neutral-500">-</p>;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-40 shrink-0" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="none" animationDuration={700}>
              {data.map((d, i) => <Cell key={d.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip content={<Tip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-2xl font-bold text-neutral-900">{total}</span>
          <span className="text-[11px] text-neutral-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-[13px]">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="flex-1 text-neutral-700">{d.name}</span>
            <span className="tabular font-semibold text-neutral-900">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
