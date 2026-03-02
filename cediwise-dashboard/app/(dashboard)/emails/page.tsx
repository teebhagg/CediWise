import { EmailComposerDialog } from "@/components/emails/email-composer-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listEmailCampaigns } from "@/lib/actions/emails";

const PER_PAGE = 20;

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);

  const { data, total } = await listEmailCampaigns(page, PER_PAGE);

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
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-4 text-left font-medium">Created</th>
                    <th className="h-10 px-4 text-left font-medium">Subject</th>
                    <th className="h-10 px-4 text-left font-medium">Template</th>
                    <th className="h-10 px-4 text-left font-medium">Source</th>
                    <th className="h-10 px-4 text-left font-medium">Recipients</th>
                    <th className="h-10 px-4 text-left font-medium">Result</th>
                    <th className="h-10 px-4 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="h-24 px-4 text-center text-muted-foreground">
                        No email campaigns yet.
                      </td>
                    </tr>
                  ) : (
                    data.map((campaign) => (
                      <tr key={campaign.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(campaign.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 max-w-[320px] truncate" title={campaign.subject}>
                          {campaign.subject}
                        </td>
                        <td className="px-4 py-3">{campaign.template_key}</td>
                        <td className="px-4 py-3">{campaign.source}</td>
                        <td className="px-4 py-3">{campaign.recipient_count}</td>
                        <td className="px-4 py-3">{campaign.success_count}/{campaign.recipient_count}</td>
                        <td className="px-4 py-3">{campaign.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t px-4 py-3 text-sm text-muted-foreground">Total campaigns: {total}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
