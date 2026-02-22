import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listFeedback } from "@/lib/actions/lesson-feedback";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Suspense } from "react";
import { FeedbackActions } from "./feedback-actions";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Pending feedback and items needing your attention.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lesson feedback</CardTitle>
          <CardDescription>
            User feedback on lessons that needs resolution. Resolve items here or manage all feedback in Learning Data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FeedbackSkeleton />}>
            <FeedbackNotificationList page={page} />
          </Suspense>
          <div className="mt-4">
            <Link href="/learning-data/feedback">
              <Button variant="outline" size="sm">
                View all feedback
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-1 size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const NOTIFICATIONS_PER_PAGE = 10;

async function FeedbackNotificationList({ page }: { page: number }) {
  const { data: unresolved, total } = await listFeedback(
    undefined,
    false,
    page,
    NOTIFICATIONS_PER_PAGE
  );

  if (unresolved.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pending feedback. All items are resolved.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        <span className="text-muted-foreground">{total}</span> item{total === 1 ? "" : "s"} pending
      </p>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">Lesson</th>
                <th className="h-10 px-4 text-left font-medium">Type</th>
                <th className="h-10 px-4 text-left font-medium">Rating</th>
                <th className="h-10 px-4 text-left font-medium">Comment</th>
                <th className="h-10 px-4 text-left font-medium">Created</th>
                <th className="h-10 px-4 w-24" />
              </tr>
            </thead>
            <tbody>
              {unresolved.map((f) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{f.lesson_id}</td>
                  <td className="px-4 py-3">{f.feedback_type ?? "—"}</td>
                  <td className="px-4 py-3">{f.rating ?? "—"}</td>
                  <td className="px-4 py-3 max-w-xs truncate" title={f.comment ?? ""}>
                    {f.comment ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <FeedbackActions feedbackId={f.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {total > NOTIFICATIONS_PER_PAGE && (
        <p className="text-xs text-muted-foreground">
          Showing page {page} ({unresolved.length} of {total}).{" "}
          <Link href="/learning-data/feedback" className="underline hover:text-foreground">
            View all
          </Link>
        </p>
      )}
    </div>
  );
}

function FeedbackSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-48 animate-pulse rounded-lg bg-muted/50" />
    </div>
  );
}
