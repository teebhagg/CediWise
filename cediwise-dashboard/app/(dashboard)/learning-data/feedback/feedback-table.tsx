"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import type { FeedbackRow } from "@/lib/actions/lesson-feedback";
import { resolveFeedback } from "@/lib/actions/lesson-feedback";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface FeedbackTableProps {
  feedback: FeedbackRow[];
  total: number;
  page: number;
  perPage: number;
}

export function FeedbackTable({ feedback, total, page, perPage }: FeedbackTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onPageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/learning-data/feedback?${params.toString()}`);
  }
  const [resolving, setResolving] = useState<string | null>(null);

  async function handleResolve(id: string) {
    setResolving(id);
    const { error } = await resolveFeedback(id);
    setResolving(null);
    if (error) alert(error);
    else router.refresh();
  }

  const unresolved = feedback.filter((f) => !f.is_resolved);
  const resolved = feedback.filter((f) => f.is_resolved);
  const displayData = [...unresolved, ...resolved];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">Lesson</th>
                <th className="h-10 px-4 text-left font-medium">Type</th>
                <th className="h-10 px-4 text-left font-medium">Rating</th>
                <th className="h-10 px-4 text-left font-medium">Comment</th>
                <th className="h-10 px-4 text-left font-medium">Status</th>
                <th className="h-10 px-4 text-left font-medium">Created</th>
                <th className="h-10 px-4 w-24" />
              </tr>
            </thead>
            <tbody>
              {displayData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-24 px-4 text-center text-muted-foreground">
                    No feedback yet.
                  </td>
                </tr>
              ) : (
                displayData.map((f) => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{f.lesson_id}</td>
                    <td className="px-4 py-3">{f.feedback_type ?? "—"}</td>
                    <td className="px-4 py-3">{f.rating ?? "—"}</td>
                    <td className="px-4 py-3 max-w-xs truncate" title={f.comment ?? ""}>
                      {f.comment ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {f.is_resolved ? (
                        <Badge variant="secondary">Resolved</Badge>
                      ) : (
                        <Badge variant="default">Open</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {!f.is_resolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resolving === f.id}
                          onClick={() => handleResolve(f.id)}
                        >
                          {resolving === f.id ? "..." : "Resolve"}
                        </Button>
                      )}
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
        />
      </div>
    </div>
  );
}
