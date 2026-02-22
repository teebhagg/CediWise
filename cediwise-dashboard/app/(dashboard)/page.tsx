import { RangeToggle } from "@/components/dashboard/range-toggle";
import { RecentUsersTable } from "@/components/dashboard/recent-users-table";
import {
  CompletionsChart,
  ProfileBreakdownChart,
  RegistrationsChart,
} from "@/components/dashboard/simple-charts";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  fetchCompletionsByDay,
  fetchDashboardKpis,
  fetchProfileBreakdown,
  fetchRecentUsers,
  fetchRegistrationsByDay,
  fetchUserMetrics,
} from "@/lib/actions/dashboard";
import { Suspense } from "react";

const RANGE_DAYS = { week: 7, month: 30, year: 365 } as const;

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Overview of CediWise admin data and metrics.
        </p>
      </header>

      {/* Section 1: Key metrics (primary KPIs) */}
      <section>
        <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
          Key metrics
        </h2>
        <Suspense fallback={<PrimaryKpisSkeleton />}>
          <PrimaryKpisCards />
        </Suspense>
      </section>

      {/* Section 2: User health & learning */}
      <section>
        <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
          User health & learning
        </h2>
        <Suspense fallback={<SecondaryMetricsSkeleton />}>
          <SecondaryMetricsCards />
        </Suspense>
      </section>

      <Separator />

      {/* Section 3: Engagement charts */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Engagement
          </h2>
          <Suspense fallback={<div className="h-8 w-32 rounded-lg bg-muted/50" />}>
            <RangeToggle />
          </Suspense>
        </div>
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Registrations</CardTitle>
              <CardDescription>
                <EngagementDescription searchParams={searchParams} type="registrations" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <RegistrationsChartWrapper searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Profile breakdown</CardTitle>
              <CardDescription>Setup status across users</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton height={220} />}>
                <ProfileBreakdownChartWrapper />
              </Suspense>
            </CardContent>
          </Card>
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lesson completions</CardTitle>
              <CardDescription>
                <EngagementDescription searchParams={searchParams} type="completions" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <CompletionsChartWrapper searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 4: Recent activity */}
      <section>
        <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
          Recent activity
        </h2>
        <div className="grid gap-6">
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent users</CardTitle>
              <CardDescription>Latest registrations</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<TableSkeleton />}>
                <RecentUsersTableWrapper />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

async function PrimaryKpisCards() {
  const [metrics, kpis] = await Promise.all([
    fetchUserMetrics(),
    fetchDashboardKpis(),
  ]);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total users"
        value={metrics.totalUsers}
        description="Registered accounts"
        href="/users"
        variant="primary"
      />
      <StatCard
        title="New this week"
        value={metrics.newUsersThisWeek}
        description="Last 7 days"
        variant="primary"
      />
      <StatCard
        title="Lessons"
        value={kpis.lessonsCount}
        description="In catalog"
        href="/learning-data/lessons"
        variant="primary"
      />
      <StatCard
        title="Pending feedback"
        value={kpis.pendingFeedback}
        description="Unresolved"
        href="/learning-data/feedback"
        variant="primary"
      />
    </div>
  );
}

async function SecondaryMetricsCards() {
  const [metrics, kpis] = await Promise.all([
    fetchUserMetrics(),
    fetchDashboardKpis(),
  ]);
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      <StatCard
        title="With profile"
        value={metrics.usersWithProfiles}
        description="Has profile record"
      />
      <StatCard
        title="Setup completed"
        value={metrics.setupCompletedCount}
        description="Finished onboarding"
      />
      <StatCard
        title="Without profile"
        value={metrics.usersWithoutProfiles}
        description="No profile yet"
      />
      <StatCard
        title="New this month"
        value={metrics.newUsersThisMonth}
        description="Last 30 days"
      />
      <StatCard
        title="Completions this week"
        value={kpis.completionsThisWeek}
        description="Lesson completions"
      />
    </div>
  );
}

const RANGE_LABELS = {
  week: "last 7 days",
  month: "last 30 days",
  year: "last 365 days",
} as const;

async function EngagementDescription({
  searchParams,
  type,
}: {
  searchParams: Promise<{ range?: string }>;
  type: "registrations" | "completions";
}) {
  const params = await searchParams;
  const range = (params.range as "week" | "month" | "year") || "month";
  const label = RANGE_LABELS[range];
  return type === "registrations" ? (
    <>New signups per day ({label})</>
  ) : (
    <>Completions per day ({label})</>
  );
}

async function RegistrationsChartWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = (params.range as "week" | "month" | "year") || "month";
  const days = RANGE_DAYS[range];
  const data = await fetchRegistrationsByDay(days);
  return <RegistrationsChart data={data} />;
}

async function ProfileBreakdownChartWrapper() {
  const data = await fetchProfileBreakdown();
  return <ProfileBreakdownChart data={data} />;
}

async function CompletionsChartWrapper({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = (params.range as "week" | "month" | "year") || "month";
  const days = RANGE_DAYS[range];
  const data = await fetchCompletionsByDay(days);
  return <CompletionsChart data={data} />;
}

async function RecentUsersTableWrapper() {
  const users = await fetchRecentUsers(10);
  return <RecentUsersTable users={users} />;
}

function PrimaryKpisSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-9 w-14 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SecondaryMetricsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-12 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-28 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-lg bg-muted/50"
      style={{ height }}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border overflow-hidden">
        <div className="space-y-0">
          <div className="h-10 bg-muted/50" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex h-14 items-center gap-4 border-t px-4"
            >
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <div className="h-9 w-28 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
