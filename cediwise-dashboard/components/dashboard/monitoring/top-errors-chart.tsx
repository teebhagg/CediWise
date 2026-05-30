"use client";

import type { SentryIssue } from "@/lib/types/dashboard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TopErrorsChartProps {
  data: SentryIssue[];
}

export function TopErrorsChart({ data }: TopErrorsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    );
  }

  const chartData = data.slice(0, 10).map((issue) => ({
    label: issue.title.length > 30 ? issue.title.slice(0, 30) + "..." : issue.title,
    value: issue.count,
    permalink: issue.permalink,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
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
          formatter={(value: number | undefined) => [value ?? 0, "Events"]}
          labelFormatter={(label) => `Issue: ${label}`}
        />
        <Bar
          dataKey="value"
          fill="var(--chart-4)"
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
          cursor="pointer"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
