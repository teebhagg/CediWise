import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listTbillRates } from "@/lib/actions/tbill-rates";
import { Suspense } from "react";
import { AddTbillRateForm } from "./add-tbill-rate-form";
import { TbillRatesTable } from "./tbill-rates-table";

const PER_PAGE = 20;

export default async function TbillRatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">T-Bill Rates</h1>
        <p className="text-muted-foreground">
          Manage live Treasury Bill rates for the app.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add rate</CardTitle>
          <CardDescription>
            Add a new T-Bill rate. Tenor examples: 91-day, 182-day, 364-day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddTbillRateForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent rates</CardTitle>
          <CardDescription>
            Latest T-Bill rates, most recent first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/50" />}>
            <TbillRatesTableWrapper page={page} perPage={PER_PAGE} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function TbillRatesTableWrapper({
  page,
  perPage,
}: {
  page: number;
  perPage: number;
}) {
  const { data: rates, total } = await listTbillRates(page, perPage);
  return (
    <TbillRatesTable
      rates={rates}
      total={total}
      page={page}
      perPage={perPage}
    />
  );
}
