"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import type { SubscriptionActivityEntry } from "@/lib/types/dashboard";
import { useRouter, useSearchParams } from "next/navigation";

interface ActivityTableProps {
  entries: SubscriptionActivityEntry[];
  total: number;
  page: number;
  perPage: number;
  eventTypeFilter?: string;
}

const EVENT_LABELS: Record<string, string> = {
  trial_started: "Trial Started",
  trial_ended: "Trial Ended",
  early_bird_claimed: "Early Bird",
  tier_upgraded: "Upgraded",
  tier_downgraded: "Downgraded",
  tier_stacked: "Trial Stacked",
  subscription_activated: "Activated",
  subscription_cancelled: "Cancelled",
  subscription_renewed: "Renewed",
  payment_failed: "Payment Failed",
};

const EVENT_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  trial_started: "secondary",
  trial_ended: "outline",
  early_bird_claimed: "default",
  tier_upgraded: "default",
  tier_downgraded: "destructive",
  tier_stacked: "secondary",
  subscription_activated: "default",
  subscription_cancelled: "destructive",
  subscription_renewed: "default",
  payment_failed: "destructive",
};

export function ActivityTable({
  entries,
  total,
  page,
  perPage,
  eventTypeFilter,
}: ActivityTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/subscriptions?${params.toString()}`);
  }

  function onPageChange(newPage: number) {
    updateParams({ page: String(newPage) });
  }

  function onPerPageChange(newPerPage: number) {
    updateParams({ perPage: String(newPerPage), page: "1" });
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={eventTypeFilter ?? "all"}
          onValueChange={(val) => updateParams({ eventType: val, page: "1" })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {Object.entries(EVENT_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">When</th>
                <th className="h-10 px-4 text-left font-medium">User</th>
                <th className="h-10 px-4 text-left font-medium">Event</th>
                <th className="h-10 px-4 text-left font-medium">From</th>
                <th className="h-10 px-4 text-left font-medium">To</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="h-24 px-4 text-center text-muted-foreground"
                  >
                    No subscription activity found.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {entry.userName ?? "—"}
                        </span>
                        {entry.userEmail && (
                          <span className="text-muted-foreground text-xs">
                            {entry.userEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={EVENT_VARIANTS[entry.eventType] ?? "outline"}>
                        {EVENT_LABELS[entry.eventType] ?? entry.eventType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.fromTier
                        ? `${entry.fromTier} (${entry.fromStatus ?? "—"})`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {entry.toTier
                        ? `${entry.toTier} (${entry.toStatus ?? "—"})`
                        : "—"}
                    </td>
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
    </div>
  );
}
