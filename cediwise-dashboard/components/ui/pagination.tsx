"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface PaginationProps {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  perPage,
  total,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t">
      <p className="text-sm text-muted-foreground">
        Showing {total === 0 ? 0 : start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
        </Button>
      </div>
    </div>
  );
}
