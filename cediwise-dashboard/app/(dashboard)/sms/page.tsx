import { SmsComposerDialog } from "@/components/sms/sms-composer-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listSmsCampaigns } from "@/lib/actions/sms";

import { SmsCampaignsTable } from "./campaigns-table";

export default async function SmsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string }>;
}) {
  const { page: pageStr, perPage: perPageStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);
  const perPage = Math.max(1, Number.parseInt(perPageStr ?? "20", 10) || 20);

  const { data, total } = await listSmsCampaigns(page, perPage);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SMS</h1>
          <p className="text-muted-foreground">Send SMS messages to phone-auth users.</p>
        </div>
        <SmsComposerDialog
          triggerLabel="New SMS"
          audienceType="single"
          source="sms_section"
          triggerVariant="default"
          triggerSize="default"
          title="Compose SMS"
          description="Create and send an SMS campaign to phone-auth users."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent campaigns</CardTitle>
          <CardDescription>Delivery history and outcomes for SMS campaigns.</CardDescription>
        </CardHeader>
        <CardContent>
          <SmsCampaignsTable data={data} total={total} page={page} perPage={perPage} />
        </CardContent>
      </Card>
    </div>
  );
}
