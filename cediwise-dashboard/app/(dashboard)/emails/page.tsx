import { EmailComposerDialog } from "@/components/emails/email-composer-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listEmailCampaigns } from "@/lib/actions/emails";

import { CampaignsTable } from "./campaigns-table";

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string }>;
}) {
  const { page: pageStr, perPage: perPageStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);
  const perPage = Math.max(1, Number.parseInt(perPageStr ?? "20", 10) || 20);

  const { data, total } = await listEmailCampaigns(page, perPage);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emails</h1>
          <p className="text-muted-foreground">Send branded emails to specific users, selected users, and feedback recipients.</p>
        </div>
        <EmailComposerDialog
          triggerLabel="New Email"
          audienceType="single"
          source="emails_section"
          triggerVariant="default"
          triggerSize="default"
          title="Compose email"
          description="Create and queue a branded CediWise email campaign."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent campaigns</CardTitle>
          <CardDescription>Delivery history and outcomes for queued email campaigns.</CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignsTable data={data} total={total} page={page} perPage={perPage} />
        </CardContent>
      </Card>
    </div>
  );
}
