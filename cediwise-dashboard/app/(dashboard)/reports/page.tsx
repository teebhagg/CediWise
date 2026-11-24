import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listWebsiteReports } from "@/lib/actions/reports";
import type { WebsiteReportFilters, ListWebsiteReportsResult } from "@/lib/actions/reports";
import {
  isWebsiteReportStatus,
  type WebsiteReportCategory,
} from "@/lib/reports/constants";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ReportsTable } from "./reports-table";

function parseIntParam(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const MAX_PER_PAGE = 100;

const CATEGORY_VALUES: WebsiteReportCategory[] = [
  "app_problem",
  "account_or_payment",
  "content_or_data",
  "safety_or_abuse",
  "other",
];

type SearchParams = Record<string, string | string[] | undefined>;

/** A repeated query parameter (`?search=a&search=b`) arrives as an array; use the first value. */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseFilters(searchParams: SearchParams): WebsiteReportFilters {
  const status = firstParam(searchParams.status) ?? "";
  const category = firstParam(searchParams.category) as WebsiteReportCategory | undefined;

  return {
    status: isWebsiteReportStatus(status) ? status : undefined,
    category: category && CATEGORY_VALUES.includes(category) ? category : undefined,
    emailStatus: firstParam(searchParams.email) === "failed" ? "failed" : undefined,
    search: firstParam(searchParams.search)?.trim() || undefined,
  };
}

/**
 * Loads reports for the page. The layout already redirects signed-out visitors;
 * this keeps the streamed children from logging an error for the same request.
 */
async function loadReports(
  filters: WebsiteReportFilters,
  page: number,
  perPage: number,
): Promise<ListWebsiteReportsResult> {
  try {
    return await listWebsiteReports(filters, page, perPage);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      redirect("/login?error=unauthorized");
    }
    throw error;
  }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseIntParam(firstParam(params.page), 1));
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, parseIntParam(firstParam(params.perPage), 20)));
  const filters = parseFilters(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Problems and questions sent from the &quot;Report an issue&quot; page on the CediWise website.
          Each report is also emailed to the team.
        </p>
      </div>
      <Suspense fallback={null}>
        <FailedEmailNotice />
      </Suspense>
      <Card>
        <CardHeader>
          <CardTitle>Report Inbox</CardTitle>
          <CardDescription>
            Filter by status, category, or text. Open a report to read the full message.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/50" />}>
            <ReportsTableWrapper page={page} perPage={perPage} filters={filters} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

/** Shows when reports were saved but the team email did not go out. */
async function FailedEmailNotice() {
  const { total } = await loadReports({ emailStatus: "failed" }, 1, 1);
  if (total === 0) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
    >
      <span>
        {total} {total === 1 ? "report" : "reports"} could not be emailed to the team. They are saved below.
      </span>
      <Link href="/reports?email=failed" className="font-medium underline underline-offset-4">
        Show failed emails
      </Link>
    </div>
  );
}

async function ReportsTableWrapper({
  page,
  perPage,
  filters,
}: {
  page: number;
  perPage: number;
  filters: WebsiteReportFilters;
}) {
  const { data: reports, total } = await loadReports(filters, page, perPage);

  return (
    <ReportsTable
      // Re-mount when the search changes so the search box shows the applied value.
      key={filters.search ?? ""}
      reports={reports}
      total={total}
      page={page}
      perPage={perPage}
      filters={filters}
    />
  );
}
