import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listProgress } from "@/lib/actions/progress";
import { Suspense } from "react";
import { ProgressTable } from "./progress-table";

const PER_PAGE = 20;

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="text-muted-foreground">
          User lesson completion and quiz scores.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Lesson Progress</CardTitle>
          <CardDescription>
            View completion status and quiz attempts. Filter by user or lesson (future).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/50" />}>
            <ProgressTableWrapper page={page} perPage={PER_PAGE} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function ProgressTableWrapper({
  page,
  perPage,
}: {
  page: number;
  perPage: number;
}) {
  const { data: progress, total } = await listProgress(undefined, undefined, page, perPage);
  return (
    <ProgressTable
      progress={progress}
      total={total}
      page={page}
      perPage={perPage}
    />
  );
}
