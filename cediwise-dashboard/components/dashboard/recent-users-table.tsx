"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RecentUser } from "@/lib/types/dashboard";
import { getPrimaryContact } from "@/lib/utils/users";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

interface RecentUsersTableProps {
  users: RecentUser[];
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function RecentUsersTable({ users }: RecentUsersTableProps) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">Name</th>
                <th className="h-10 px-4 text-left font-medium">Email / Phone</th>
                <th className="h-10 px-4 text-left font-medium">Profile</th>
                <th className="h-10 px-4 text-left font-medium">Setup</th>
                <th className="h-10 px-4 text-left font-medium">Registered</th>
                <th className="h-10 px-4 w-12" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="h-24 px-4 text-center text-muted-foreground"
                  >
                    No users yet
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const { primary, secondary } = getPrimaryContact(
                    u.email,
                    u.phone
                  );
                  return (
                    <tr
                      key={u.id}
                      className="border-b last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{primary}</span>
                          {secondary && (
                            <span className="text-muted-foreground text-xs">
                              {secondary}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.hasProfile ? (
                          <Badge variant="secondary">With profile</Badge>
                        ) : (
                          <span className="text-muted-foreground">No profile</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.hasProfile ? (
                          <Badge
                            variant={u.setupCompleted ? "default" : "outline"}
                          >
                            {u.setupCompleted ? "Done" : "Incomplete"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatRelativeDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/users/${u.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              strokeWidth={2}
                              className="ml-1 size-4"
                            />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end">
        <Link href="/users">
          <Button variant="outline" size="sm">
            View all users
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="ml-1 size-4"
            />
          </Button>
        </Link>
      </div>
    </div>
  );
}
