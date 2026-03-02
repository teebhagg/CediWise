import { AnnouncementComposer } from "./send-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listAnnouncementCampaigns } from "@/lib/actions/announcements";

const PER_PAGE = 20;

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const enabled = process.env.ENABLE_ADMIN_ANNOUNCEMENTS !== "false";

  if (!enabled) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-muted-foreground">
          Admin announcements are currently disabled by configuration.
        </p>
      </div>
    );
  }

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const { data, total } = await listAnnouncementCampaigns(page, PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-muted-foreground">Send immediate push announcements to all active mobile devices.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send announcement</CardTitle>
          <CardDescription>
            Title and body are required. Optional deep link must start with <code>/</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnnouncementComposer />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent campaigns</CardTitle>
          <CardDescription>
            {total} campaign{total === 1 ? "" : "s"} recorded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcement campaigns yet.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left font-medium">Title</th>
                      <th className="h-10 px-4 text-left font-medium">Status</th>
                      <th className="h-10 px-4 text-left font-medium">Attempted</th>
                      <th className="h-10 px-4 text-left font-medium">Success</th>
                      <th className="h-10 px-4 text-left font-medium">Failed</th>
                      <th className="h-10 px-4 text-left font-medium">Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((campaign) => (
                      <tr key={campaign.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="font-medium">{campaign.title}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">{campaign.body}</div>
                        </td>
                        <td className="px-4 py-3 uppercase text-xs tracking-wide">{campaign.status}</td>
                        <td className="px-4 py-3">{campaign.attempted_count}</td>
                        <td className="px-4 py-3">{campaign.success_count}</td>
                        <td className="px-4 py-3">{campaign.failure_count}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {campaign.sent_at ? new Date(campaign.sent_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
