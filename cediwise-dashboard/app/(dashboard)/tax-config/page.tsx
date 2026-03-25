import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listTaxConfigs } from "@/lib/actions/tax-config";
import { TaxConfigsTable } from "./table";
import { TaxManager } from "./manager";

export default async function TaxConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string }>;
}) {
  const { page: pageStr, perPage: perPageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const perPage = Math.max(1, parseInt(perPageStr ?? "20", 10) || 20);

  const { data, total } = await listTaxConfigs(page, perPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tax Configuration</h1>
          <p className="text-muted-foreground">Manage dynamic tax rates for Ghana and other future jurisdictions.</p>
        </div>
        <TaxManager />
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>History & Management</CardTitle>
          <CardDescription>
            {total} tax configuration{total === 1 ? "" : "s"} found. Only one can be active per country.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.length === 0 ? (
            <div className="p-8 text-center bg-muted/20">
              <p className="text-sm text-muted-foreground">No tax configurations found. Create your first one.</p>
            </div>
          ) : (
            <TaxConfigsTable data={data} total={total} />
          )}
        </CardContent>
      </Card>

      <div className="p-4 border rounded-lg bg-amber-500/10 border-amber-500/20 text-balance">
        <h3 className="text-sm font-semibold text-amber-600 mb-1">Architect's Warning</h3>
        <p className="text-xs text-amber-700 leading-relaxed">
          The mobile app caches the <b>Active</b> config locally at startup. Changes made here will be visible to users 
          the next time they restart the app or after their local cache expires. Ensure PAYE brackets (band widths) are ordered 
          from lowest to highest threshold.
        </p>
      </div>
    </div>
  );
}
