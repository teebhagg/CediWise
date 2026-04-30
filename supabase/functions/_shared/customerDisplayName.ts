/**
 * Resolve a display name for Paystack receipts / metadata from Supabase Auth user_metadata.
 * Matches mobile signup (`full_name` in user_metadata per cediwise-mobile-app/utils/auth.ts).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_LEN = 120;

function trimName(s: string): string {
  const t = s.trim();
  if (t.length <= MAX_LEN) return t;
  return t.slice(0, MAX_LEN);
}

/** Split for Paystack optional first_name / last_name on charge & initialize. */
export function splitDisplayName(display: string): {
  first_name: string;
  last_name: string;
} {
  const t = display.trim();
  if (!t) return { first_name: "", last_name: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

export async function resolveCustomerDisplayName(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) return null;
    const meta = data.user.user_metadata as Record<string, unknown> | undefined;
    if (!meta) return null;

    const full = meta.full_name;
    if (typeof full === "string" && full.trim()) return trimName(full);

    const name = meta.name;
    if (typeof name === "string" && name.trim()) return trimName(name);

    const fs = typeof meta.first_name === "string" ? meta.first_name.trim() : "";
    const ls = typeof meta.last_name === "string" ? meta.last_name.trim() : "";
    if (fs || ls) return trimName([fs, ls].filter(Boolean).join(" "));

    return null;
  } catch {
    return null;
  }
}
