import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listFeedback, type FeedbackCategory, type FeedbackListFilters } from "@/lib/actions/feedback";
import { Suspense } from "react";
import { FeedbackTable } from "./feedback-table";

const PER_PAGE = 20;

function parseIntParam(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFilters(searchParams: Record<string, string | undefined>): FeedbackListFilters {
  const category = searchParams.category as FeedbackCategory | undefined;
  const ratingRaw = parseIntParam(searchParams.rating, 0);
  const isBetaRaw = searchParams.isBeta;

  return {
    category:
      category && ["bug_report", "feature_request", "general_comment"].includes(category)
        ? category
        : undefined,
    rating: ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : undefined,
    isBeta: isBetaRaw === "true" ? true : isBetaRaw === "false" ? false : undefined,
    fromDate: searchParams.fromDate,
    toDate: searchParams.toDate,
    search: searchParams.search?.trim() || undefined,
  };
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseIntParam(params.page, 1));
  const filters = parseFilters(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">
          Review beta submissions from the CediWise website.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Feedback Inbox</CardTitle>
          <CardDescription>
            Filter by category, rating, beta flag, date range, and text query.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/50" />}>
            <FeedbackTableWrapper page={page} perPage={PER_PAGE} filters={filters} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function FeedbackTableWrapper({
  page,
  perPage,
  filters,
}: {
  page: number;
  perPage: number;
  filters: FeedbackListFilters;
}) {
  const { data: feedback, total } = await listFeedback(filters, page, perPage);

  return (
    <FeedbackTable
      feedback={feedback}
      total={total}
      page={page}
      perPage={perPage}
      filters={filters}
    />
  );
}
