import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listFeedback } from "@/lib/actions/lesson-feedback";
import { Suspense } from "react";
import { FeedbackTable } from "./feedback-table";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string }>;
}) {
  const { page: pageStr, perPage: perPageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const perPage = Math.max(1, parseInt(perPageStr ?? "20", 10) || 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">
          User feedback on lesson quality and clarity.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lesson Feedback</CardTitle>
          <CardDescription>
            View and resolve user feedback. Use the resolve action to mark items as addressed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/50" />}>
            <FeedbackTableWrapper page={page} perPage={perPage} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function FeedbackTableWrapper({
  page,
  perPage,
}: {
  page: number;
  perPage: number;
}) {
  const { data: feedback, total } = await listFeedback(undefined, undefined, page, perPage);
  return (
    <FeedbackTable
      feedback={feedback}
      total={total}
      page={page}
      perPage={perPage}
    />
  );
}
