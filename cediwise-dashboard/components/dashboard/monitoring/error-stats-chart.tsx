"use client";

import type { ErrorStatsData } from "@/lib/types/dashboard";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ErrorStatsChartProps {
  data: ErrorStatsData;
}

export function ErrorStatsChart({ data }: ErrorStatsChartProps) {
  const allDates = [
    ...new Set([
      ...data.fatal.map((d) => d.date),
      ...data.error.map((d) => d.date),
      ...data.warning.map((d) => d.date),
    ]),
  ].sort();

  const chartData = allDates.map((date) => ({
    label: new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
    fatal: data.fatal.find((d) => d.date === date)?.value ?? 0,
    error: data.error.find((d) => d.date === date)?.value ?? 0,
    warning: data.warning.find((d) => d.date === date)?.value ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fillFatal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-8)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--chart-8)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillError" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillWarning" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
        />
        <Area
          type="monotone"
          dataKey="fatal"
          stroke="var(--chart-8)"
          fill="url(#fillFatal)"
          strokeWidth={2}
          stackId="1"
          name="Fatal"
        />
        <Area
          type="monotone"
          dataKey="error"
          stroke="var(--chart-2)"
          fill="url(#fillError)"
          strokeWidth={2}
          stackId="1"
          name="Error"
        />
        <Area
          type="monotone"
          dataKey="warning"
          stroke="var(--chart-4)"
          fill="url(#fillWarning)"
          strokeWidth={2}
          stackId="1"
          name="Warning"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
