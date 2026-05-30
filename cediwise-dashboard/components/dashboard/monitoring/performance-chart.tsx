"use client";

import type { PerformanceData } from "@/lib/types/dashboard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PerformanceChartProps {
  data: PerformanceData;
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  if (data.transactions.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    );
  }

  const chartData = data.transactions.map((t) => ({
    label: t.name.length > 25 ? t.name.slice(0, 25) + "..." : t.name,
    p95: Number(t.p95.toFixed(0)),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit="ms" />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
          formatter={(value: number | undefined) => [`${value ?? 0}ms`, "p95"]}
        />
        <Bar dataKey="p95" fill="var(--chart-5)" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
