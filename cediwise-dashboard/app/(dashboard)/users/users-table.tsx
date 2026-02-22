"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import type { UserWithProfile } from "@/lib/actions/users";
import { getPrimaryContact } from "@/lib/utils/users";
import { ArrowRight01Icon, UserSearch01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

interface UsersTableProps {
  users: UserWithProfile[];
  total: number;
  page: number;
  perPage: number;
}

export function UsersTable({
  users,
  total,
  page,
  perPage,
}: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");

  function onPageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/users?${params.toString()}`);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <HugeiconsIcon
          icon={UserSearch01Icon}
          strokeWidth={2}
          className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2"
        />
        <Input
          placeholder="Search by name, email, phone, or ID..."
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
                <th className="h-10 px-4 text-left font-medium">Name</th>
                <th className="h-10 px-4 text-left font-medium">Email / Phone</th>
                <th className="h-10 px-4 text-left font-medium">Profile</th>
                <th className="h-10 px-4 text-left font-medium">Created</th>
                <th className="h-10 px-4 w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="h-24 px-4 text-center text-muted-foreground"
                  >
                    {users.length === 0 ? "No users found." : "No matches for your search."}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const { primary, secondary } = getPrimaryContact(u.email, u.phone);
                  return (
                    <tr
                      key={u.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {u.name || "—"}
                        </span>
                      </td>
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
                        {u.profile ? (
                          <Badge
                            variant={
                              u.profile.setupCompleted ? "default" : "secondary"
                            }
                          >
                            {u.profile.setupCompleted ? "Setup done" : "Incomplete"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No profile</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
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
