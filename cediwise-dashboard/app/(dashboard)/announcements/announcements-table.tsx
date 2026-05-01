"use client";

import { Pagination } from "@/components/ui/pagination";
import type { AnnouncementCampaignRow } from "@/lib/actions/announcements";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AnnouncementDeleteButton } from "./announcement-delete-button";

interface AnnouncementsTableProps {
  data: AnnouncementCampaignRow[];
  total: number;
  page: number;
  perPage: number;
}

export function AnnouncementsTable({
  data,
  total,
  page,
  perPage,
}: AnnouncementsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onPageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/announcements?${params.toString()}`);
  }

  function onPerPageChange(newPerPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("perPage", String(newPerPage));
    params.set("page", "1");
    router.push(`/announcements?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">Title</th>
                <th className="h-10 px-4 text-left font-medium">Audience</th>
                <th className="h-10 px-4 text-left font-medium">Status</th>
                <th className="h-10 px-4 text-left font-medium">Attempted</th>
                <th className="h-10 px-4 text-left font-medium">Success</th>
                <th className="h-10 px-4 text-left font-medium">Failed</th>
                <th className="h-10 px-4 text-left font-medium">Sent</th>
                <th className="h-10 px-4 text-right font-medium w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((campaign) => (
                <tr key={campaign.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{campaign.title}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-xs">{campaign.body}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {campaign.audience_type === "single_user" && campaign.target_user_id ? (
                      <Link
                        href={`/users/${campaign.target_user_id}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        Single user
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">All devices</span>
                    )}
                  </td>
                  <td className="px-4 py-3 uppercase text-xs tracking-wide">{campaign.status}</td>
                  <td className="px-4 py-3">{campaign.attempted_count}</td>
                  <td className="px-4 py-3">{campaign.success_count}</td>
                  <td className="px-4 py-3">{campaign.failure_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {campaign.sent_at ? new Date(campaign.sent_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AnnouncementDeleteButton campaignId={campaign.id} title={campaign.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
      />
    </div>
  );
}
