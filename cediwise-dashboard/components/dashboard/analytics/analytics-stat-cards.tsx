"use client";

import type { StatCardData } from "@/lib/types/dashboard";
import { StatCard, type StatCardTrend } from "@/components/dashboard/stat-card";

interface AnalyticsStatCardsProps {
  activeUsers: { dau: StatCardData; wau: StatCardData; mau: StatCardData };
  newUsers: StatCardData;
}

function toTrend(data: StatCardData, polarity: StatCardTrend["polarity"]): StatCardTrend | undefined {
  if (data.delta === null || data.deltaLabel === "") return undefined;
  return { change: data.delta, periodLabel: data.deltaLabel, polarity };
}

export function AnalyticsStatCards({ activeUsers, newUsers }: AnalyticsStatCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Daily Active Users"
        value={activeUsers.dau.value}
        description="Users active today"
        variant="primary"
        trend={toTrend(activeUsers.dau, "higher_is_better")}
      />
      <StatCard
        title="Weekly Active Users"
        value={activeUsers.wau.value}
        description="Users active this week"
        variant="primary"
        trend={toTrend(activeUsers.wau, "higher_is_better")}
      />
      <StatCard
        title="Monthly Active Users"
        value={activeUsers.mau.value}
        description="Users active this month"
        variant="primary"
        trend={toTrend(activeUsers.mau, "higher_is_better")}
      />
      <StatCard
        title="New Users"
        value={newUsers.value}
        description="New registrations"
        variant="primary"
        trend={toTrend(newUsers, "higher_is_better")}
      />
    </div>
  );
}
