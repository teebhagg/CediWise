"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { EmailComposerDialog } from "@/components/emails/email-composer-dialog";
import type {
  FeedbackCategory,
  FeedbackListFilters,
  FeedbackRecord,
} from "@/lib/actions/feedback";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface FeedbackTableProps {
  feedback: FeedbackRecord[];
  total: number;
  page: number;
  perPage: number;
  filters: FeedbackListFilters;
}

const categoryItems: Array<{ label: string; value: FeedbackCategory }> = [
  { label: "Bug Report", value: "bug_report" },
  { label: "Feature Request", value: "feature_request" },
  { label: "General Comment", value: "general_comment" },
];

function categoryLabel(value: FeedbackCategory) {
  return categoryItems.find((item) => item.value === value)?.label ?? value;
}

export function FeedbackTable({
  feedback,
  total,
  page,
  perPage,
  filters,
}: FeedbackTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);

  function updateParams(
    updates: Record<string, string | undefined>,
    options: { resetPage?: boolean } = {}
  ) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });

    if (options.resetPage ?? true) params.set("page", "1");

    router.push(`/feedback?${params.toString()}`);
  }

  function onPageChange(newPage: number) {
    updateParams({ page: String(newPage) }, { resetPage: false });
  }

  function onPerPageChange(newPerPage: number) {
    updateParams({ perPage: String(newPerPage), page: "1" });
  }

  function resetFilters() {
    router.push("/feedback?page=1");
  }

  // Debounced search effect
  useEffect(() => {
    // Skip if searchQuery matches search (e.g. initial mount or after manual Enter/params update)
    const currentSearch = filters.search ?? "";
    if (currentSearch === searchInput.trim()) return;

    const timer = setTimeout(() => {
      updateParams({ search: searchInput.trim() || undefined });
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchInput, filters.search]);

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.category ||
      filters.rating ||
      filters.search ||
      filters.fromDate ||
      filters.toDate ||
      typeof filters.isBeta === "boolean"
    );
  }, [filters]);

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
            placeholder="Search email or feedback..."
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
          items={[{ label: "All categories", value: "all" }, ...categoryItems]}
          value={filters.category ?? "all"}
          onValueChange={(value) =>
            updateParams({
              category: (value ?? "all") === "all" ? undefined : (value ?? undefined),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All categories</SelectItem>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          items={[
            { label: "All ratings", value: "all" },
            { label: "5 stars", value: "5" },
            { label: "4 stars", value: "4" },
            { label: "3 stars", value: "3" },
            { label: "2 stars", value: "2" },
            { label: "1 star", value: "1" },
          ]}
          value={filters.rating ? String(filters.rating) : "all"}
          onValueChange={(value) =>
            updateParams({
              rating: (value ?? "all") === "all" ? undefined : (value ?? undefined),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All ratings</SelectItem>
              {[5, 4, 3, 2, 1].map((rating) => (
                <SelectItem key={rating} value={String(rating)}>
                  {rating} {rating === 1 ? "star" : "stars"}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          items={[
            { label: "All sources", value: "all" },
            { label: "Beta only", value: "true" },
            { label: "Non-beta only", value: "false" },
          ]}
          value={typeof filters.isBeta === "boolean" ? String(filters.isBeta) : "all"}
          onValueChange={(value) =>
            updateParams({
              isBeta: (value ?? "all") === "all" ? undefined : (value ?? undefined),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="true">Beta only</SelectItem>
              <SelectItem value="false">Non-beta only</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <div>
          <Input
            type="date"
            value={filters.fromDate ?? ""}
            onChange={(event) =>
              updateParams({ fromDate: event.target.value || undefined })
            }
            aria-label="From date"
          />
        </div>

        <div className="flex gap-2">
          <Input
            type="date"
            value={filters.toDate ?? ""}
            onChange={(event) =>
              updateParams({ toDate: event.target.value || undefined })
            }
            aria-label="To date"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => updateParams({ search: searchInput.trim() || undefined })}
          >
            Apply
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Newest submissions first</p>
        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Reset filters
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">Created</th>
                <th className="h-10 px-4 text-left font-medium">Category</th>
                <th className="h-10 px-4 text-left font-medium">Rating</th>
                <th className="h-10 px-4 text-left font-medium">Email</th>
                <th className="h-10 px-4 text-left font-medium">Version</th>
                <th className="h-10 px-4 text-left font-medium">Beta</th>
                <th className="h-10 px-4 text-left font-medium">Feedback</th>
                <th className="h-10 px-4 w-28" />
              </tr>
            </thead>
            <tbody>
              {feedback.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-24 px-4 text-center text-muted-foreground">
                    No feedback matches your current filters.
                  </td>
                </tr>
              ) : (
                feedback.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{categoryLabel(item.category)}</td>
                    <td className="px-4 py-3">{item.rating}</td>
                    <td className="px-4 py-3 max-w-[220px] truncate" title={item.email}>
                      {item.email}
                    </td>
                    <td className="px-4 py-3">{item.version}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.is_beta ? "default" : "secondary"}>
                        {item.is_beta ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 max-w-[320px] truncate" title={item.feedback_text}>
                      {item.feedback_text}
                    </td>
                    <td className="px-4 py-3">
                      <Dialog>
                        <DialogTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedFeedback(item)}
                            />
                          }
                        >
                          View
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                          <DialogHeader>
                            <DialogTitle>Feedback detail</DialogTitle>
                            <DialogDescription>
                              Full feedback content and metadata.
                            </DialogDescription>
                          </DialogHeader>

                          {selectedFeedback?.id === item.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Category</p>
                                  <p className="font-medium">{categoryLabel(item.category)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Rating</p>
                                  <p className="font-medium">{item.rating}/5</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Email</p>
                                  <p className="font-medium break-all">{item.email}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Version</p>
                                  <p className="font-medium">{item.version}</p>
                                </div>
                              </div>

                              <div className="rounded-lg border bg-muted/30 p-3">
                                <p className="text-muted-foreground mb-1 text-xs">Feedback message</p>
                                <p className="whitespace-pre-wrap text-sm">{item.feedback_text}</p>
                              </div>
                            </div>
                          ) : null}

                          <DialogFooter>
                            <EmailComposerDialog
                              triggerLabel="Reply via email"
                              recipients={[
                                {
                                  email: item.email,
                                  name: undefined,
                                },
                              ]}
                              lockedRecipients={true}
                              audienceType="feedback_reply"
                              source="app_feedback"
                              sourceFeedbackId={item.id}
                              title="Reply to feedback"
                              description="Send a branded follow-up to this feedback submitter."
                              contextChips={[
                                `Category: ${categoryLabel(item.category)}`,
                                `Rating: ${item.rating}/5`,
                                `Version: ${item.version}`,
                                `Submitted: ${new Date(item.created_at).toLocaleDateString()}`,
                              ]}
                            />
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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
