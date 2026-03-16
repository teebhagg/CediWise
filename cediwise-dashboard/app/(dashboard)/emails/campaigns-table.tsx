"use client";

import { Pagination } from "@/components/ui/pagination";
import type { EmailCampaignRow } from "@/lib/actions/emails";
import { useRouter, useSearchParams } from "next/navigation";

interface CampaignsTableProps {
  data: EmailCampaignRow[];
  total: number;
  page: number;
  perPage: number;
}

export function CampaignsTable({
  data,
  total,
  page,
  perPage,
}: CampaignsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onPageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/emails?${params.toString()}`);
  }

  function onPerPageChange(newPerPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("perPage", String(newPerPage));
    params.set("page", "1");
    router.push(`/emails?${params.toString()}`);
  }

  return (
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
