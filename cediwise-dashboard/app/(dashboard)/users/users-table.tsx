"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmailComposerDialog } from "@/components/emails/email-composer-dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import type { UserWithProfile } from "@/lib/actions/users";
import { getPrimaryContact } from "@/lib/utils/users";
import { ArrowRight01Icon, UserSearch01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface UsersTableProps {
  users: UserWithProfile[];
  total: number;
  page: number;
  perPage: number;
  searchQuery?: string;
}

export function UsersTable({
  users,
  total,
  page,
  perPage,
  searchQuery,
}: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchQuery ?? "");
  const [selectedIds, setSelectedIds] = useState<Array<string>>([]);

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/users?${params.toString()}`);
  }

  function onPageChange(newPage: number) {
    updateParams({ page: String(newPage) });
  }

  function onPerPageChange(newPerPage: number) {
    updateParams({ perPage: String(newPerPage), page: "1" });
  }

  function handleSearch(val: string) {
    updateParams({ search: val.trim() || undefined, page: "1" });
  }

  // Debounced search effect
  useEffect(() => {
    // Skip if searchQuery matches search (e.g. initial mount or after manual Enter/params update)
    if ((searchQuery ?? "") === search.trim()) return;

    const timer = setTimeout(() => {
      handleSearch(search);
    }, 1500);

    return () => clearTimeout(timer);
  }, [search, searchQuery]);

  const selectedRecipients = useMemo(() => {
    return users
      .filter((u) => selectedIds.includes(u.id))
      .map((u) => ({
        userId: u.id,
        email: u.email ?? "",
        name: u.name ?? undefined,
      }))
      .filter((recipient) => recipient.email.trim().length > 0);
  }, [users, selectedIds]);

  const selectedMissingEmailCount = useMemo(() => {
    return users.filter((u) => selectedIds.includes(u.id) && !u.email).length;
  }, [users, selectedIds]);

  const allVisibleSelected = users.length > 0 && selectedIds.length === users.length;

  function toggleRow(userId: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(userId) ? prev : [...prev, userId];
      return prev.filter((id) => id !== userId);
    });
  }

  function toggleAllVisible(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(users.map((user) => user.id));
  }

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 p-3">
          <p className="text-sm text-muted-foreground">
            {selectedIds.length} selected
            {selectedMissingEmailCount > 0
              ? ` (${selectedMissingEmailCount} without valid email will be skipped)`
              : ""}
          </p>
          <div className="flex items-center gap-2">
            <EmailComposerDialog
              triggerLabel="Send Email"
              triggerVariant="default"
              triggerSize="sm"
              recipients={selectedRecipients}
              lockedRecipients={true}
              audienceType="selected_users"
              source="users_tab"
              title="Email selected users"
              description="Send a branded email to selected users."
            />
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch(search);
            }
          }}
          className="pl-9"
        />
      </div>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium w-12">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(event) => toggleAllVisible(event.target.checked)}
                    aria-label="Select all visible users"
                  />
                </th>
                <th className="h-10 px-4 text-left font-medium">Name</th>
                <th className="h-10 px-4 text-left font-medium">Email / Phone</th>
                <th className="h-10 px-4 text-left font-medium">Profile</th>
                <th className="h-10 px-4 text-left font-medium">Created</th>
                <th className="h-10 px-4 w-48" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="h-24 px-4 text-center text-muted-foreground"
                  >
                    {searchQuery ? "No matches for your search." : "No users found."}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const { primary, secondary } = getPrimaryContact(u.email, u.phone);
                  const hasEmail = !!u.email;
                  return (
                    <tr
                      key={u.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(u.id)}
                          onChange={(event) => toggleRow(u.id, event.target.checked)}
                          aria-label={`Select ${u.name || u.email || u.id}`}
                        />
                      </td>
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
                        <div className="flex items-center gap-2">
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
                          {hasEmail ? (
                            <EmailComposerDialog
                              triggerLabel="Email"
                              recipients={[
                                {
                                  userId: u.id,
                                  email: u.email ?? "",
                                  name: u.name ?? undefined,
                                },
                              ]}
                              lockedRecipients={true}
                              audienceType="single"
                              source="users_tab"
                              title="Email user"
                              description="Send a branded email to this user."
                            />
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              No email
                            </Button>
                          )}
                        </div>
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
          onPerPageChange={onPerPageChange}
        />
      </div>
    </div>
  );
}
