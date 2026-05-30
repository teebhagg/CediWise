"use client";

import type { StatCardData } from "@/lib/types/dashboard";
import { StatCard, type StatCardTrend } from "@/components/dashboard/stat-card";

interface MonitoringStatCardsProps {
  unresolvedIssues: StatCardData;
  affectedUsers: StatCardData;
  overallP95: StatCardData;
}

function toTrend(data: StatCardData, polarity: StatCardTrend["polarity"]): StatCardTrend | undefined {
  if (data.delta === null || data.deltaLabel === "") return undefined;
  return { change: data.delta, periodLabel: data.deltaLabel, polarity };
}

export function MonitoringStatCards({ unresolvedIssues, affectedUsers, overallP95 }: MonitoringStatCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        title="Unresolved Issues"
        value={unresolvedIssues.value}
        description="Issues created this period"
        variant="primary"
        trend={toTrend(unresolvedIssues, "lower_is_better")}
      />
      <StatCard
        title="Affected Users"
        value={affectedUsers.value}
        description="Users impacted"
        variant="primary"
        trend={toTrend(affectedUsers, "lower_is_better")}
      />
      <StatCard
        title="P95 Load Time"
        value={overallP95.value}
        description="Slowest transaction p95"
        variant="primary"
        trend={toTrend(overallP95, "lower_is_better")}
      />
    </div>
  );
}
