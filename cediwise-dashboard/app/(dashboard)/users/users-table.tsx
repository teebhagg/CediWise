"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmailComposerDialog } from "@/components/emails/email-composer-dialog";
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
import type { UserWithProfile, UsersListFilters } from "@/lib/actions/users";
import { getPrimaryContact, isCediwisePhoneUser } from "@/lib/utils/users";
import { SmsComposerDialog } from "@/components/sms/sms-composer-dialog";
import { ArrowRight01Icon, UserSearch01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

interface UsersTableProps {
  users: UserWithProfile[];
  total: number;
  page: number;
  perPage: number;
  filters: UsersListFilters;
}

export function UsersTable({
  users,
  total,
  page,
  perPage,
  filters,
}: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.search ?? "");
  const [selectedIds, setSelectedIds] = useState<Array<string>>([]);

  const updateParams = useCallback(function updateParams(
    updates: Record<string, string | undefined>,
    options: { resetPage?: boolean } = {}
  ) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    if (options.resetPage ?? true) {
      params.set("page", "1");
    }
    router.push(`/users?${params.toString()}`);
  }, [router, searchParams]);

  function onPageChange(newPage: number) {
    updateParams({ page: String(newPage) }, { resetPage: false });
  }

  function onPerPageChange(newPerPage: number) {
    updateParams({ perPage: String(newPerPage), page: "1" });
  }

  function applySearch(val: string) {
    const trimmed = val.trim();
    if (trimmed.length === 0) {
      updateParams({ search: undefined, page: "1" });
      return;
    }
    if (trimmed.length < 3) return;
    updateParams({ search: trimmed, page: "1" });
  }

  function resetFilters() {
    setSearch("");
    router.push("/users?page=1");
  }

  useEffect(() => {
    const currentSearch = filters.search ?? "";
    const trimmed = search.trim();
    if (currentSearch === trimmed) return;

    const timer = setTimeout(() => {
      const nextValue = search.trim();
      if (nextValue.length === 0) {
        updateParams({ search: undefined, page: "1" });
        return;
      }
      if (nextValue.length < 3) return;
      updateParams({ search: nextValue, page: "1" });
    }, 1500);

    return () => clearTimeout(timer);
  }, [search, filters.search, updateParams]);

  const selectedRecipients = useMemo(() => {
    return users
      .filter((u) => selectedIds.includes(u.id) && !isCediwisePhoneUser(u.email))
      .map((u) => ({
        userId: u.id,
        email: u.email ?? "",
        name: u.name ?? undefined,
      }))
      .filter((recipient) => recipient.email.trim().length > 0);
  }, [users, selectedIds]);

  const selectedSmsRecipients = useMemo(() => {
    return users
      .filter((u) => selectedIds.includes(u.id) && (!!u.phone || isCediwisePhoneUser(u.email)))
      .map((u) => {
        const { primary } = getPrimaryContact(u.email, u.phone);
        return {
          userId: u.id,
          phone: primary,
          name: u.name ?? undefined,
        };
      })
      .filter((recipient) => recipient.phone.trim().length > 0);
  }, [users, selectedIds]);

  const selectedMissingEmailCount = useMemo(() => {
    return users.filter((u) => {
      if (!selectedIds.includes(u.id)) return false;
      const isPhoneUser = isCediwisePhoneUser(u.email);
      return !isPhoneUser && !u.email;
    }).length;
  }, [users, selectedIds]);

  const allVisibleSelected = users.length > 0 && selectedIds.length === users.length;
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.search ||
      filters.profileStatus ||
      filters.tier ||
      filters.subscriptionStatus ||
      filters.inactiveDays ||
      filters.versionStatus
    );
  }, [filters]);

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
              ? ` (${selectedMissingEmailCount} without valid contact will be skipped)`
              : ""}
          </p>
          <div className="flex items-center gap-2">
            <EmailComposerDialog
              triggerLabel="Send Email"
              triggerVariant="outline"
              triggerSize="sm"
              recipients={selectedRecipients}
              lockedRecipients={true}
              audienceType="selected_users"
              source="users_tab"
              title="Email selected users"
              description="Send a branded email to selected users."
            />
            <SmsComposerDialog
              triggerLabel="Send SMS"
              triggerVariant="default"
              triggerSize="sm"
              recipients={selectedSmsRecipients}
              audienceType="selected_users"
              source="users_tab"
              title="SMS selected users"
              description="Send an SMS to selected phone-auth users."
            />
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
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
                applySearch(search);
              }
            }}
            className="pl-9"
          />
        </div>

        <Select
          items={[
            { label: "All profiles", value: "all" },
            { label: "Setup complete", value: "complete" },
            { label: "Setup incomplete", value: "incomplete" },
            { label: "No profile", value: "missing" },
          ]}
          value={filters.profileStatus ?? "all"}
          onValueChange={(value) =>
            updateParams({
              profileStatus: value === "all" ? undefined : value ?? undefined,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All profiles" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All profiles</SelectItem>
              <SelectItem value="complete">Setup complete</SelectItem>
              <SelectItem value="incomplete">Setup incomplete</SelectItem>
              <SelectItem value="missing">No profile</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          items={[
            { label: "All tiers", value: "all" },
            { label: "Free", value: "free" },
            { label: "Budget", value: "budget" },
            { label: "SME", value: "sme" },
          ]}
          value={filters.tier ?? "all"}
          onValueChange={(value) =>
            updateParams({ tier: value === "all" ? undefined : value ?? undefined })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="budget">Budget</SelectItem>
              <SelectItem value="sme">SME</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          items={[
            { label: "All statuses", value: "all" },
            { label: "Active", value: "active" },
            { label: "Trial", value: "trial" },
            { label: "Expired", value: "expired" },
            { label: "Canceled", value: "canceled" },
          ]}
          value={filters.subscriptionStatus ?? "all"}
          onValueChange={(value) =>
            updateParams({
              subscriptionStatus: value === "all" ? undefined : value ?? undefined,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          items={[
            { label: "Any activity", value: "all" },
            { label: "15+ days inactive", value: "15" },
            { label: "30+ days inactive", value: "30" },
            { label: "45+ days inactive", value: "45" },
            { label: "60+ days inactive", value: "60" },
            { label: "75+ days inactive", value: "75" },
            { label: "90+ days inactive", value: "90" },
          ]}
          value={filters.inactiveDays ? String(filters.inactiveDays) : "all"}
          onValueChange={(value) =>
            updateParams({
              inactiveDays: value === "all" ? undefined : value ?? undefined,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Any activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Any activity</SelectItem>
              <SelectItem value="15">15+ days inactive</SelectItem>
              <SelectItem value="30">30+ days inactive</SelectItem>
              <SelectItem value="45">45+ days inactive</SelectItem>
              <SelectItem value="60">60+ days inactive</SelectItem>
              <SelectItem value="75">75+ days inactive</SelectItem>
              <SelectItem value="90">90+ days inactive</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          items={[
            { label: "All versions", value: "all" },
            { label: "Outdated", value: "outdated" },
            { label: "Current", value: "current" },
            { label: "Unknown", value: "unknown" },
          ]}
          value={filters.versionStatus ?? "all"}
          onValueChange={(value) =>
            updateParams({
              versionStatus: value === "all" ? undefined : value ?? undefined,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All versions" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All versions</SelectItem>
              <SelectItem value="outdated">Outdated</SelectItem>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Search runs automatically at 3+ characters. Clear to reset.
        </p>
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
                <th className="h-10 px-4 text-left font-medium">Tier</th>
                <th className="h-10 px-4 text-left font-medium">Status</th>
                <th className="h-10 px-4 text-left font-medium">Trial ends</th>
                <th className="h-10 px-4 text-left font-medium">Created</th>
                <th className="h-10 px-4 w-48" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="h-24 px-4 text-center text-muted-foreground"
                  >
                    {filters.search ? "No matches for your search." : "No users found."}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const { primary, secondary } = getPrimaryContact(u.email, u.phone);
                  const hasEmail = !!u.email && !isCediwisePhoneUser(u.email);
                  const hasPhone = !!u.phone || isCediwisePhoneUser(u.email);
                  const isPhoneAuth = isCediwisePhoneUser(u.email);
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
                      <td className="px-4 py-3">
                        {u.subscription ? (
                          <Badge
                            variant={
                              u.subscription.tier === "sme"
                                ? "default"
                                : u.subscription.tier === "budget"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {u.subscription.tier.toUpperCase()}
                          </Badge>
                        ) : (
                          <Badge variant="outline">FREE</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.subscription ? (
                          <Badge
                            variant={
                              u.subscription.status === "active"
                                ? "default"
                                : u.subscription.status === "trial"
                                  ? "secondary"
                                  : u.subscription.status === "expired"
                                    ? "destructive"
                                    : "outline"
                            }
                          >
                            {u.subscription.status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.subscription?.trialEndsAt
                          ? new Date(u.subscription.trialEndsAt).toLocaleDateString()
                          : "—"}
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
                          {isPhoneAuth && hasPhone ? (
                            <SmsComposerDialog
                              triggerLabel="SMS"
                              recipients={[
                                {
                                  userId: u.id,
                                  phone: u.phone ?? primary,
                                  name: u.name ?? undefined,
                                },
                              ]}
                              audienceType="single"
                              source="users_tab"
                              title="SMS user"
                              description="Send an SMS to this user."
                            />
                          ) : hasEmail ? (
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
                              No contact
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
