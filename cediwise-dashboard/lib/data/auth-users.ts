import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

/**
 * Paginate through all Auth users (Admin API). Single-page listUsers caps at perPage.
 */
export async function listAllAuthUsersWithAdmin(
  admin: ReturnType<typeof createAdminClient>
): Promise<User[]> {
  const all: User[] = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data?.users ?? [];
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return all;
}

/** One paginated scan per request for dashboard metrics that need every user. */
export const getCachedAuthUsers = cache(async (): Promise<User[]> => {
  const admin = createAdminClient();
  return listAllAuthUsersWithAdmin(admin);
});
