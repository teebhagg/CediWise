import Constants from "expo-constants";
import { Platform } from "react-native";

import { supabase } from "@/utils/supabase";
import { log } from "@/utils/logger";

export type ActiveAppVersionPolicy = {
  version: string;
  requiresUpdate: boolean;
  releaseNotes: string | null;
};

function normalizeVersion(version: string): number[] {
  return version
    .split(".")
    .slice(0, 3)
    .map((segment) => {
      const n = Number.parseInt(segment, 10);
      return Number.isFinite(n) ? n : 0;
    })
    .concat([0, 0, 0])
    .slice(0, 3);
}

/**
 * Compare semver-like strings (major.minor.patch).
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const av = normalizeVersion(a);
  const bv = normalizeVersion(b);

  for (let i = 0; i < 3; i += 1) {
    if (av[i] < bv[i]) return -1;
    if (av[i] > bv[i]) return 1;
  }
  return 0;
}

function currentVersion(): string {
  return Constants.expoConfig?.version ?? "0.0.0";
}

/**
 * Fetches active update policy for the current platform.
 * If new columns are not available yet, falls back to version-only read.
 */
export async function getActiveAppVersionPolicy(): Promise<ActiveAppVersionPolicy | null> {
  const client = supabase;
  if (!client) return null;

  const platform = Platform.OS === "ios" ? "ios" : "android";

  const query = () =>
    client
      .from("app_versions")
      .select("version,release_notes,requires_update")
      .eq("platform", platform)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  const fallbackQuery = () =>
    client
      .from("app_versions")
      .select("version")
      .eq("platform", platform)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  const { data, error } = await query();
  if (!error) {
    if (!data?.version) return null;
    return {
      version: data.version,
      requiresUpdate: Boolean(data.requires_update),
      releaseNotes:
        typeof data.release_notes === "string" && data.release_notes.trim().length > 0
          ? data.release_notes.trim()
          : null,
    };
  }

  // Deploy-safe fallback while DB migration is being rolled out.
  if (/does not exist|column/i.test(String(error.message ?? ""))) {
    const fallback = await fallbackQuery();
    if (fallback.error || !fallback.data?.version) {
      return null;
    }
    return {
      version: fallback.data.version,
      requiresUpdate: false,
      releaseNotes: null,
    };
  }

  log.warn("getActiveAppVersionPolicy failed", error);
  return null;
}

export function isCurrentBuildOutdated(latestVersion: string): boolean {
  return compareVersions(currentVersion(), latestVersion) < 0;
}
