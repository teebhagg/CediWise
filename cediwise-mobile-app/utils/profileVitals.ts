import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export type PersonalizationStrategy = "survival" | "balanced" | "aggressive";
export type UtilitiesMode = "general" | "precise";
export type PrimaryGoal = "emergency_fund" | "project" | "investment";

export type ProfileVitals = {
  setup_completed: boolean;
  payday_day: number | null;
  interests: string[];

  stable_salary: number;
  auto_tax: boolean;
  side_income: number;

  rent: number;
  tithe_remittance: number;
  debt_obligations: number;
  utilities_mode: UtilitiesMode;
  utilities_total: number;
  utilities_ecg: number;
  utilities_water: number;

  primary_goal: PrimaryGoal | null;

  strategy: PersonalizationStrategy | null;
  needs_pct: number | null;
  wants_pct: number | null;
  savings_pct: number | null;
};

const STATUS_KEY_PREFIX = "@cediwise_personalization_status:";
const DRAFT_KEY_PREFIX = "@cediwise_vitals_draft:";
const VITALS_KEY_PREFIX = "@cediwise_profile_vitals:";

function statusKey(userId: string) {
  return `${STATUS_KEY_PREFIX}${userId}`;
}

export function vitalsDraftKey(userId: string) {
  return `${DRAFT_KEY_PREFIX}${userId}`;
}

function vitalsKey(userId: string) {
  return `${VITALS_KEY_PREFIX}${userId}`;
}

export type PersonalizationStatusCache = {
  setupCompleted: boolean;
  updatedAt: string; // ISO
  /** When true, user chose "Skip (use general plan)" and should not be sent to vitals again. */
  skippedVitals?: boolean;
};

export type ProfileVitalsCache = {
  vitals: ProfileVitals;
  updatedAt: string; // ISO
};

export async function readPersonalizationStatusCache(
  userId: string
): Promise<PersonalizationStatusCache | null> {
  try {
    const raw = await AsyncStorage.getItem(statusKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersonalizationStatusCache;
    if (typeof parsed?.setupCompleted !== "boolean") return null;
    if (typeof parsed?.updatedAt !== "string") return null;
    return {
      ...parsed,
      skippedVitals: parsed.skippedVitals === true,
    };
  } catch {
    return null;
  }
}

export async function writePersonalizationStatusCache(
  userId: string,
  setupCompleted: boolean,
  options?: { skippedVitals?: boolean }
): Promise<void> {
  const payload: PersonalizationStatusCache = {
    setupCompleted,
    updatedAt: new Date().toISOString(),
    ...(options?.skippedVitals !== undefined && {
      skippedVitals: options.skippedVitals,
    }),
  };
  try {
    await AsyncStorage.setItem(statusKey(userId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export async function readProfileVitalsCache(
  userId: string
): Promise<ProfileVitalsCache | null> {
  try {
    const raw = await AsyncStorage.getItem(vitalsKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileVitalsCache;
    if (!parsed || typeof parsed.updatedAt !== "string") return null;
    if (!parsed.vitals || typeof parsed.vitals !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeProfileVitalsCache(
  userId: string,
  vitals: ProfileVitals
): Promise<void> {
  const payload: ProfileVitalsCache = {
    vitals,
    updatedAt: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(vitalsKey(userId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/**
 * Returns the route to send the user to after login, based on personalization status.
 * Use from index, OTP success, and OAuth callback so vitals gate is consistent.
 */
export async function getPostAuthRoute(
  userId: string
): Promise<"/(tabs)" | "/vitals"> {
  const cached = await readPersonalizationStatusCache(userId);
  if (cached?.setupCompleted || cached?.skippedVitals) return "/(tabs)";
  try {
    const status = await fetchPersonalizationStatusRemote(userId);
    await writePersonalizationStatusCache(userId, status.setupCompleted);
    return status.setupCompleted ? "/(tabs)" : "/vitals";
  } catch {
    return cached?.setupCompleted || cached?.skippedVitals
      ? "/(tabs)"
      : "/vitals";
  }
}

export async function fetchPersonalizationStatusRemote(
  userId: string
): Promise<{
  exists: boolean;
  setupCompleted: boolean;
}> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("profiles")
    .select("setup_completed")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { exists: false, setupCompleted: false };
  return { exists: true, setupCompleted: !!(data as any).setup_completed };
}

export async function fetchProfileVitalsRemote(
  userId: string
): Promise<ProfileVitals | null> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("profiles")
    .select(
      [
        "setup_completed",
        "payday_day",
        "interests",
        "stable_salary",
        "auto_tax",
        "side_income",
        "rent",
        "tithe_remittance",
        "debt_obligations",
        "utilities_mode",
        "utilities_total",
        "utilities_ecg",
        "utilities_water",
        "primary_goal",
        "strategy",
        "needs_pct",
        "wants_pct",
        "savings_pct",
      ].join(",")
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const interests = Array.isArray((data as any).interests)
    ? ((data as any).interests as string[]).filter((x) => typeof x === "string")
    : [];

  return {
    setup_completed: !!(data as any).setup_completed,
    payday_day:
      typeof (data as any).payday_day === "number"
        ? (data as any).payday_day
        : null,
    interests,

    stable_salary: Number((data as any).stable_salary ?? 0) || 0,
    auto_tax: !!(data as any).auto_tax,
    side_income: Number((data as any).side_income ?? 0) || 0,

    rent: Number((data as any).rent ?? 0) || 0,
    tithe_remittance: Number((data as any).tithe_remittance ?? 0) || 0,
    debt_obligations: Number((data as any).debt_obligations ?? 0) || 0,
    utilities_mode:
      (data as any).utilities_mode === "precise" ? "precise" : "general",
    utilities_total: Number((data as any).utilities_total ?? 0) || 0,
    utilities_ecg: Number((data as any).utilities_ecg ?? 0) || 0,
    utilities_water: Number((data as any).utilities_water ?? 0) || 0,

    primary_goal:
      (data as any).primary_goal === "emergency_fund" ||
      (data as any).primary_goal === "project" ||
      (data as any).primary_goal === "investment"
        ? ((data as any).primary_goal as PrimaryGoal)
        : null,

    strategy:
      (data as any).strategy === "survival" ||
      (data as any).strategy === "balanced" ||
      (data as any).strategy === "aggressive"
        ? ((data as any).strategy as PersonalizationStrategy)
        : null,
    needs_pct:
      typeof (data as any).needs_pct === "number"
        ? (data as any).needs_pct
        : null,
    wants_pct:
      typeof (data as any).wants_pct === "number"
        ? (data as any).wants_pct
        : null,
    savings_pct:
      typeof (data as any).savings_pct === "number"
        ? (data as any).savings_pct
        : null,
  };
}
