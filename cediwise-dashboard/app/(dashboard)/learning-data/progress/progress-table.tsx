"use client";

import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import type { ProgressRow } from "@/lib/actions/progress";
import { UserSearch01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

interface ProgressTableProps {
  progress: ProgressRow[];
  total: number;
  page: number;
  perPage: number;
}

export function ProgressTable({ progress, total, page, perPage }: ProgressTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");

  function onPageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/learning-data/progress?${params.toString()}`);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return progress;
    return progress.filter(
      (p) =>
        p.user_id.toLowerCase().includes(q) ||
        p.lesson_id.toLowerCase().includes(q)
    );
  }, [progress, search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <HugeiconsIcon
          icon={UserSearch01Icon}
          strokeWidth={2}
          className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2"
        />
        <Input
          placeholder="Search by user or lesson ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">User ID</th>
                <th className="h-10 px-4 text-left font-medium">Lesson</th>
                <th className="h-10 px-4 text-left font-medium">Completed</th>
                <th className="h-10 px-4 text-left font-medium">Quiz score</th>
                <th className="h-10 px-4 text-left font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="h-24 px-4 text-center text-muted-foreground">
                    No progress records found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-32" title={p.user_id}>
                      {p.user_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{p.lesson_id}</td>
                    <td className="px-4 py-3">
                      {p.completed_at
                        ? new Date(p.completed_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.quiz_score != null
                        ? `${Math.round((p.quiz_score as number) * 100)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(p.updated_at).toLocaleString()}
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
