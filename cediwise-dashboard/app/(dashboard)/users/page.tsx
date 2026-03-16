import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listUsersWithProfiles } from "@/lib/actions/users";
import { UserSearch01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Suspense } from "react";
import { UsersTable } from "./users-table";


export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string; search?: string }>;
}) {
  const { page: pageStr, perPage: perPageStr, search } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const perPage = Math.max(1, parseInt(perPageStr ?? "20", 10) || 20);

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
            <UsersTableWrapper page={page} perPage={perPage} search={search} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function UsersTableWrapper({
  page,
  perPage,
  search,
}: {
  page: number;
  perPage: number;
  search?: string;
}) {
  const { users, total } = await listUsersWithProfiles(page, perPage, search);
  return (
    <UsersTable
      users={users}
      total={total}
      page={page}
      perPage={perPage}
      searchQuery={search}
    />
  );
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
