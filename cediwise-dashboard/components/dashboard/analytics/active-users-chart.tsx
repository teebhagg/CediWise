"use client";

import type { ActiveUsersData } from "@/lib/types/dashboard";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ActiveUsersChartProps {
  data: ActiveUsersData;
}

export function ActiveUsersChart({ data }: ActiveUsersChartProps) {
  const allDates = [
    ...new Set([
      ...data.series.dau.map((d) => d.date),
      ...data.series.wau.map((d) => d.date),
      ...data.series.mau.map((d) => d.date),
    ]),
  ].sort();

  const chartData = allDates.map((date) => {
    const label = new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    return {
      label,
      dau: data.series.dau.find((d) => d.date === date)?.value ?? 0,
      wau: data.series.wau.find((d) => d.date === date)?.value ?? 0,
      mau: data.series.mau.find((d) => d.date === date)?.value ?? 0,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        <Line type="monotone" dataKey="dau" stroke="var(--chart-1)" strokeWidth={2} dot={false} name="DAU" />
        <Line type="monotone" dataKey="wau" stroke="var(--chart-2)" strokeWidth={2} dot={false} name="WAU" />
        <Line type="monotone" dataKey="mau" stroke="var(--chart-3)" strokeWidth={2} dot={false} name="MAU" />
      </LineChart>
    </ResponsiveContainer>
  );
}
