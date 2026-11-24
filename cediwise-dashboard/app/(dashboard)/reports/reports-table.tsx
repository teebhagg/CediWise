"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateWebsiteReportStatus, type WebsiteReportFilters, type WebsiteReportRecord } from "@/lib/actions/reports";
import {
  WEBSITE_REPORT_CATEGORY_OPTIONS,
  WEBSITE_REPORT_STATUS_OPTIONS,
  websiteReportCategoryLabel,
  websiteReportStatusLabel,
  type WebsiteReportEmailStatus,
} from "@/lib/reports/constants";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

interface ReportsTableProps {
  reports: WebsiteReportRecord[];
  total: number;
  page: number;
  perPage: number;
  filters: WebsiteReportFilters;
}

const statusItems = [{ label: "All statuses", value: "all" }, ...WEBSITE_REPORT_STATUS_OPTIONS];
const categoryItems = [{ label: "All categories", value: "all" }, ...WEBSITE_REPORT_CATEGORY_OPTIONS];

const emailStatusLabel: Record<WebsiteReportEmailStatus, string> = {
  pending: "Email pending",
  sent: "Emailed",
  failed: "Email failed",
};

function senderLabel(report: WebsiteReportRecord) {
  return report.reporter_name ? `${report.reporter_name} <${report.reporter_email}>` : report.reporter_email;
}

export function ReportsTable({ reports, total, page, perPage, filters }: ReportsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [selected, setSelected] = useState<WebsiteReportRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function updateParams(updates: Record<string, string | undefined>, options: { resetPage?: boolean } = {}) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });

    if (options.resetPage ?? true) params.set("page", "1");

    router.push(`/reports?${params.toString()}`);
  }

  function changeStatus(reportId: string, status: string | null) {
    if (!status) return;
    setActionError(null);
    startTransition(async () => {
      try {
        await updateWebsiteReportStatus(reportId, status);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not update the status.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2"
          />
          <Input
            placeholder="Search email or message..."
            className="pl-9"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                updateParams({ search: searchInput.trim() || undefined });
              }
            }}
          />
        </div>

        <Select
          items={statusItems}
          value={filters.status ?? "all"}
          onValueChange={(value) =>
            updateParams({ status: !value || value === "all" ? undefined : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {statusItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          items={categoryItems}
          value={filters.category ?? "all"}
          onValueChange={(value) =>
            updateParams({ category: !value || value === "all" ? undefined : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="flex gap-2 lg:col-span-2">
          <Button type="button" variant="outline" onClick={() => updateParams({ search: searchInput.trim() || undefined })}>
            Apply
          </Button>
          {filters.status || filters.category || filters.search || filters.emailStatus ? (
            <Button type="button" variant="ghost" onClick={() => router.push("/reports?page=1")}>
              Reset filters
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">Created</th>
                <th className="h-10 px-4 text-left font-medium">Category</th>
                <th className="h-10 px-4 text-left font-medium">From</th>
                <th className="h-10 px-4 text-left font-medium">Message</th>
                <th className="h-10 px-4 text-left font-medium">Email</th>
                <th className="h-10 px-4 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 px-4 text-center text-muted-foreground">
                    No reports match your current filters.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors align-top">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(report.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{websiteReportCategoryLabel(report.category)}</td>
                    <td className="px-4 py-3 max-w-[220px] truncate" title={senderLabel(report)}>
                      {senderLabel(report)}
                    </td>
                    <td className="px-4 py-3 max-w-[360px]">
                      <button
                        type="button"
                        onClick={() => setSelected(report)}
                        className="line-clamp-2 text-left hover:underline"
                      >
                        {report.message}
                      </button>
                      {report.page ? (
                        <p className="mt-1 text-xs text-muted-foreground truncate">Page: {report.page}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={report.email_status === "failed" ? "destructive" : "secondary"}>
                        {emailStatusLabel[report.email_status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        items={WEBSITE_REPORT_STATUS_OPTIONS}
                        value={report.status}
                        disabled={isPending}
                        onValueChange={(value) => changeStatus(report.id, value)}
                      >
                        <SelectTrigger size="sm" aria-label={`Status for report from ${report.reporter_email}`}>
                          <SelectValue placeholder={websiteReportStatusLabel(report.status)} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {WEBSITE_REPORT_STATUS_OPTIONS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
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
          onPageChange={(newPage) => updateParams({ page: String(newPage) }, { resetPage: false })}
          onPerPageChange={(newPerPage) => updateParams({ perPage: String(newPerPage), page: "1" })}
        />
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{websiteReportCategoryLabel(selected.category)}</DialogTitle>
                <DialogDescription>
                  {senderLabel(selected)} · {new Date(selected.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="whitespace-pre-wrap rounded-lg border p-3">{selected.message}</p>
                <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-muted-foreground">
                  <dt>Page or screen</dt>
                  <dd className="text-foreground">{selected.page ?? "Not given"}</dd>
                  <dt>Status</dt>
                  <dd className="text-foreground">{websiteReportStatusLabel(selected.status)}</dd>
                  <dt>Email</dt>
                  <dd className="text-foreground">{emailStatusLabel[selected.email_status]}</dd>
                  <dt>Report ID</dt>
                  <dd className="font-mono text-xs text-foreground break-all">{selected.id}</dd>
                </dl>
                <a
                  href={`mailto:${selected.reporter_email}?subject=${encodeURIComponent("Re: your CediWise report")}`}
                  className="inline-flex text-sm font-medium underline underline-offset-4"
                >
                  Reply by email
                </a>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
