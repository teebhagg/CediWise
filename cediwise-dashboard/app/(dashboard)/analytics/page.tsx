import { ActiveUsersChart } from "@/components/dashboard/analytics/active-users-chart";
import { AnalyticsStatCards } from "@/components/dashboard/analytics/analytics-stat-cards";
import { EventBreakdownChart } from "@/components/dashboard/analytics/event-breakdown-chart";
import { SectionSummary } from "@/components/dashboard/section-summary";
import { TopEventsChart } from "@/components/dashboard/analytics/top-events-chart";
import { RangeToggle } from "@/components/dashboard/range-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getActiveUsers,
  getEventBreakdown,
  getTopEvents,
  getTotalUsers,
} from "@/lib/posthog";
import { Suspense } from "react";

type Period = "day" | "week" | "month" | "year";

const RANGE_PERIOD: Record<string, Period> = {
  week: "week",
  month: "month",
  year: "year",
};

export default function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Analytics
        </h1>
        <p className="mt-1 text-muted-foreground">
          PostHog-powered product and usage analytics.
        </p>
      </header>

      <Suspense fallback={<div className="h-5 w-full animate-pulse rounded bg-muted/50" />}>
        <AnalyticsSummaryWrapper searchParams={searchParams} />
      </Suspense>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Overview
          </h2>
          <Suspense fallback={<div className="h-8 w-32 rounded-lg bg-muted/50" />}>
            <RangeToggle />
          </Suspense>
        </div>
        <Suspense fallback={<AnalyticsStatCardsSkeleton />}>
          <AnalyticsStatCardsWrapper searchParams={searchParams} />
        </Suspense>
      </section>

      <section>
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Active Users</CardTitle>
              <CardDescription>DAU, WAU, MAU over time</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <ActiveUsersChartWrapper searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Event Breakdown</CardTitle>
              <CardDescription>Distribution by event type</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton height={220} />}>
                <EventBreakdownChartWrapper searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Events</CardTitle>
              <CardDescription>Most frequent events</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <TopEventsChartWrapper searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

async function AnalyticsSummaryWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const period = RANGE_PERIOD[params.range ?? ""] ?? "month";
  const [activeUsers, topEvents] = await Promise.all([
    getActiveUsers(period),
    getTopEvents(period),
  ]);

  const mauVal = typeof activeUsers.mau.value === "number" ? activeUsers.mau.value : 0;
  const periodLabel = period === "day" ? "today" : period === "week" ? "this week" : period === "month" ? "this month" : "this year";

  let summary = `${mauVal} active user${mauVal !== 1 ? "s" : ""} ${periodLabel}.`;

  if (topEvents.length > 0 && topEvents[0].value > 0) {
    summary += ` Top event: ${topEvents[0].label} — ${topEvents[0].value} event${topEvents[0].value !== 1 ? "s" : ""}.`;
  }

  return <SectionSummary text={summary} />;
}

async function AnalyticsStatCardsWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const period = RANGE_PERIOD[params.range ?? ""] ?? "month";
  const [activeUsers, newUsers] = await Promise.all([
    getActiveUsers(period),
    getTotalUsers(period),
  ]);
  return <AnalyticsStatCards activeUsers={activeUsers} newUsers={newUsers} />;
}

async function ActiveUsersChartWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const period = RANGE_PERIOD[params.range ?? ""] ?? "month";
  const data = await getActiveUsers(period);
  return <ActiveUsersChart data={data} />;
}

async function EventBreakdownChartWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const period = RANGE_PERIOD[params.range ?? ""] ?? "month";
  const data = await getEventBreakdown(period);
  return <EventBreakdownChart data={data} />;
}

async function TopEventsChartWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const period = RANGE_PERIOD[params.range ?? ""] ?? "month";
  const data = await getTopEvents(period);
  return <TopEventsChart data={data} />;
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-lg bg-muted/50"
      style={{ height }}
    />
  );
}

function AnalyticsStatCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-9 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
