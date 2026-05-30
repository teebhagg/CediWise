import { ErrorStatsChart } from "@/components/dashboard/monitoring/error-stats-chart";
import { ErrorsTable } from "@/components/dashboard/monitoring/errors-table";
import { MonitoringStatCards } from "@/components/dashboard/monitoring/monitoring-stat-cards";
import { PerformanceChart } from "@/components/dashboard/monitoring/performance-chart";
import { SectionSummary } from "@/components/dashboard/section-summary";
import { TopErrorsChart } from "@/components/dashboard/monitoring/top-errors-chart";
import { RangeToggle } from "@/components/dashboard/range-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAffectedUsers,
  getErrorStats,
  getPerformanceData,
  getUnresolvedIssues,
} from "@/lib/sentry";
import { Suspense } from "react";

type Period = "week" | "month" | "year";

const RANGE_PERIOD: Record<string, Period> = {
  week: "week",
  month: "month",
  year: "year",
};

export default function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Monitoring
        </h1>
        <p className="mt-1 text-muted-foreground">
          Sentry-powered error tracking and performance monitoring.
        </p>
      </header>

      <Suspense fallback={<div className="h-5 w-full animate-pulse rounded bg-muted/50" />}>
        <MonitoringSummaryWrapper searchParams={searchParams} />
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
        <Suspense fallback={<MonitoringStatCardsSkeleton />}>
          <MonitoringStatCardsWrapper searchParams={searchParams} />
        </Suspense>
      </section>

      <section>
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Errors Over Time</CardTitle>
            <CardDescription>Fatal, error, and warning volume</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartSkeleton />}>
              <ErrorStatsChartWrapper searchParams={searchParams} />
            </Suspense>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Errors</CardTitle>
              <CardDescription>Most frequent issues (click to open in Sentry)</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <TopErrorsChartWrapper searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance by Transaction</CardTitle>
              <CardDescription>p95 load times</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <PerformanceChartWrapper searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">All Issues</CardTitle>
            <CardDescription>Unresolved errors this period</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<TableSkeleton />}>
              <ErrorsTableWrapper searchParams={searchParams} />
            </Suspense>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

async function MonitoringSummaryWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const period = RANGE_PERIOD[params.range ?? ""] ?? "month";
  const [{ issues, total }, affectedUsers] = await Promise.all([
    getUnresolvedIssues(period),
    getAffectedUsers(period),
  ]);

  const topIssue = issues.reduce((top, i) => (i.count > (top?.count ?? 0) ? i : top), issues[0]);

  const totalVal = typeof total.value === "number" ? total.value : 0;
  const parts: string[] = [
    `${totalVal} issue${totalVal !== 1 ? "s" : ""}`,
  ];

  const affVal = typeof affectedUsers.value === "number" ? affectedUsers.value : 0;
  if (affVal > 0) {
    parts.push(`affecting ${affVal} user${affVal !== 1 ? "s" : ""}`);
  }

  const periodLabel = period === "week" ? "this week" : period === "month" ? "this month" : "this year";

  let summary = `${parts.join(" ")} ${periodLabel}.`;
  if (topIssue && topIssue.count > 0) {
    const topLabel = topIssue.title.length > 70 ? topIssue.title.slice(0, 70) + "…" : topIssue.title;
    summary += ` Most frequent: "${topLabel}" — ${topIssue.count} event${topIssue.count !== 1 ? "s" : ""}.`;
  }

  return <SectionSummary text={summary} />;
}

async function MonitoringStatCardsWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const period = RANGE_PERIOD[params.range ?? ""] ?? "month";
  const [unresolved, affectedUsers, performance] = await Promise.all([
    getUnresolvedIssues(period),
    getAffectedUsers(period),
    getPerformanceData(period),
  ]);
  return (
    <MonitoringStatCards
      unresolvedIssues={unresolved.total}
      affectedUsers={affectedUsers}
      overallP95={performance.overallP95}
    />
  );
}

async function ErrorStatsChartWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const period = RANGE_PERIOD[params.range ?? ""] ?? "month";
  const data = await getErrorStats(period);
  return <ErrorStatsChart data={data} />;
}

async function TopErrorsChartWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const period = RANGE_PERIOD[params.range ?? ""] ?? "month";
  const { issues } = await getUnresolvedIssues(period);
  return <TopErrorsChart data={issues} />;
}

async function PerformanceChartWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const period = RANGE_PERIOD[params.range ?? ""] ?? "month";
  const data = await getPerformanceData(period);
  return <PerformanceChart data={data} />;
}

async function ErrorsTableWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const period = RANGE_PERIOD[params.range ?? ""] ?? "month";
  const { issues } = await getUnresolvedIssues(period);
  return <ErrorsTable data={issues} />;
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-lg bg-muted/50"
      style={{ height }}
    />
  );
}

function MonitoringStatCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
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

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        <div className="space-y-0">
          <div className="h-10 bg-muted/50" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex h-14 items-center gap-4 border-t px-4"
            >
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
