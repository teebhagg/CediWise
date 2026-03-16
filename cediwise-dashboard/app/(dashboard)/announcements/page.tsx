import { AnnouncementComposer } from "./send-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listAnnouncementCampaigns } from "@/lib/actions/announcements";

import { AnnouncementsTable } from "./announcements-table";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string }>;
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

  const { page: pageStr, perPage: perPageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const perPage = Math.max(1, parseInt(perPageStr ?? "20", 10) || 20);

  const { data, total } = await listAnnouncementCampaigns(page, perPage);

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
            <AnnouncementsTable data={data} total={total} page={page} perPage={perPage} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
