"use client";

import type { SentryIssue } from "@/lib/types/dashboard";
import { Badge } from "@/components/ui/badge";

interface ErrorsTableProps {
  data: SentryIssue[];
}

const levelColors: Record<string, string> = {
  fatal: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  error: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  warning: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

function readableLabel(issue: SentryIssue): string {
  const meta = issue.metadata;
  if (issue.title.includes("[object Object]") && meta.value) {
    return `${meta.type}: ${meta.value}`;
  }
  return issue.title;
}

function featureHint(issue: SentryIssue): string {
  if (issue.culprit) return issue.culprit;
  if (issue.metadata.filename) {
    const file = issue.metadata.filename.split("/").pop() ?? "";
    return issue.metadata.function ? `${issue.metadata.function} in ${file}` : file;
  }
  return "";
}

export function ErrorsTable({ data }: ErrorsTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No issues to display
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-10 px-4 text-left font-medium">Level</th>
              <th className="h-10 px-4 text-left font-medium">Issue</th>
              <th className="h-10 px-4 text-left font-medium">Location</th>
              <th className="h-10 px-4 text-right font-medium">Events</th>
              <th className="h-10 px-4 text-right font-medium">Users</th>
              <th className="h-10 px-4 text-left font-medium">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 20).map((issue) => (
              <tr
                key={issue.id}
                className="cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/30"
                onClick={() => window.open(issue.permalink, "_blank")}
              >
                <td className="px-4 py-3">
                  <Badge variant="outline" className={levelColors[issue.level] || ""}>
                    {issue.level}
                  </Badge>
                </td>
                <td className="max-w-[280px] px-4 py-3">
                  <p className="truncate font-medium">{readableLabel(issue)}</p>
                  <p className="truncate text-muted-foreground text-xs">
                    {issue.title.includes("[object Object]") ? "" : issue.metadata.type}
                  </p>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground text-xs">
                  {featureHint(issue)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{issue.count}</td>
                <td className="px-4 py-3 text-right tabular-nums">{issue.userCount}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                  {new Date(issue.lastSeen).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
