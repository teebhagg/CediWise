import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listUsersWithProfiles,
  type UsersListFilters,
} from "@/lib/actions/users";
import { sanitizeInactiveDays } from "@/lib/utils/user-filters";
import { UserSearch01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Suspense } from "react";
import { UsersTable } from "./users-table";


export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { page: pageStr, perPage: perPageStr } = params;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const perPage = Math.max(1, parseInt(perPageStr ?? "20", 10) || 20);
  const filters = parseUsersFilters(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage app users and profiles.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Search and manage user accounts. Click a user to view or edit their profile.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<UsersTableSkeleton />}>
            <UsersTableWrapper page={page} perPage={perPage} filters={filters} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function UsersTableWrapper({
  page,
  perPage,
  filters,
}: {
  page: number;
  perPage: number;
  filters: UsersListFilters;
}) {
  const { users, total } = await listUsersWithProfiles(page, perPage, filters);
  return (
    <UsersTable
      key={JSON.stringify({ page, perPage, ...filters })}
      users={users}
      total={total}
      page={page}
      perPage={perPage}
      filters={filters}
    />
  );
}

function parseUsersFilters(
  searchParams: Record<string, string | undefined>
): UsersListFilters {
  const profileStatus = searchParams.profileStatus;
  const tier = searchParams.tier;
  const subscriptionStatus = searchParams.subscriptionStatus;
  const versionStatus = searchParams.versionStatus;

  return {
    search: searchParams.search?.trim() || undefined,
    profileStatus:
      profileStatus === "complete" ||
      profileStatus === "incomplete" ||
      profileStatus === "missing"
        ? profileStatus
        : undefined,
    tier:
      tier === "free" || tier === "budget" || tier === "sme"
        ? tier
        : undefined,
    subscriptionStatus:
      subscriptionStatus === "active" ||
      subscriptionStatus === "trial" ||
      subscriptionStatus === "expired" ||
      subscriptionStatus === "canceled"
        ? subscriptionStatus
        : undefined,
    inactiveDays: sanitizeInactiveDays(searchParams.inactiveDays),
    versionStatus:
      versionStatus === "outdated" ||
      versionStatus === "current" ||
      versionStatus === "unknown"
        ? versionStatus
        : undefined,
  };
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex h-10 items-center gap-2 rounded-lg bg-muted/50 px-3">
        <HugeiconsIcon icon={UserSearch01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="rounded-lg border">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex h-12 items-center gap-4 border-b px-4 last:border-0">
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
