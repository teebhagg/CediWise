import { StatCard } from "@/components/dashboard/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";
import {
  fetchSubscriptionMetrics,
  fetchSubscriptionActivityLog,
} from "@/lib/actions/subscriptions";
import { ActivityTable } from "./activity-table";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string; eventType?: string }>;
}) {
  const { page: pageStr, perPage: perPageStr, eventType } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const perPage = Math.max(1, parseInt(perPageStr ?? "20", 10) || 20);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Subscriptions
        </h1>
        <p className="mt-1 text-muted-foreground">
          Subscription activity and revenue metrics.
        </p>
      </header>

      {/* Revenue Summary */}
      <section>
        <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
          Revenue summary
        </h2>
        <Suspense fallback={<RevenueSummarySkeleton />}>
          <SubscriptionRevenueSummary />
        </Suspense>
      </section>

      {/* Activity Log */}
      <section>
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity Log</CardTitle>
            <CardDescription>
              Recent subscription changes, upgrades, trial events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<TableSkeleton />}>
              <ActivityTableWrapper
                page={page}
                perPage={perPage}
                eventType={eventType}
              />
            </Suspense>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

async function SubscriptionRevenueSummary() {
  const metrics = await fetchSubscriptionMetrics();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="MRR"
        value={`GHS ${metrics.mrr.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`}
        description="Monthly Recurring Revenue"
        variant="primary"
      />
      <StatCard
        title="Paid active"
        value={metrics.paidActiveCount}
        description="Budget + SME"
        variant="primary"
      />
      <StatCard
        title="On trial"
        value={metrics.trialCount}
        description="Trial users"
      />
      <StatCard
        title="Early bird"
        value={`${metrics.earlyBirdUsed}/${metrics.earlyBirdTotal}`}
        description={
          metrics.earlyBirdUsed >= metrics.earlyBirdTotal
            ? "All claimed"
            : "Slots used"
        }
      />
    </div>
  );
}

async function ActivityTableWrapper({
  page,
  perPage,
  eventType,
}: {
  page: number;
  perPage: number;
  eventType?: string;
}) {
  const { entries, total } = await fetchSubscriptionActivityLog(
    page,
    perPage,
    eventType
  );
  return (
    <ActivityTable
      entries={entries}
      total={total}
      page={page}
      perPage={perPage}
      eventTypeFilter={eventType}
    />
  );
}

function RevenueSummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-28 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-9 w-[200px] animate-pulse rounded bg-muted" />
      <div className="rounded-lg border overflow-hidden">
        <div className="h-10 bg-muted/50" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex h-14 items-center gap-4 border-t px-4"
          >
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
