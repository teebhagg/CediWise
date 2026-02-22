import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Role-first admin check: DB admin_users first, then env allowlist fallback.
 * Call this in server components/layout; it is async.
 */
export async function isAdmin(
  userId: string | undefined,
  email: string | undefined
): Promise<boolean> {
  if (!userId) return false;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return true;
  } catch {
    // Table may not exist yet or DB error; fall through to allowlist
  }

  return isAdminAllowlist(userId, email);
}

/**
 * Env allowlist fallback: ADMIN_EMAILS or ADMIN_USER_IDS (comma-separated).
 */
export function isAdminAllowlist(
  userId: string | undefined,
  email: string | undefined
): boolean {
  const emailsRaw = process.env.ADMIN_EMAILS ?? "";
  const idsRaw = process.env.ADMIN_USER_IDS ?? "";
  const emails = emailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const ids = idsRaw
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);

  if (email && emails.length > 0 && emails.includes(email.toLowerCase()))
    return true;
  if (userId && ids.length > 0 && ids.includes(userId)) return true;
  return false;
}
