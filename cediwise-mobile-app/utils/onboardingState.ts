import AsyncStorage from "@react-native-async-storage/async-storage";

import { readTourSeen } from "@/utils/tourStorage";
import { supabase } from "./supabase";

export const ONBOARDING_VERSION = 1;
const LOCAL_CACHE_PREFIX = "@cediwise_onboarding_state:";
const RECENT_ACCOUNT_WINDOW_DAYS = 4;

export type OnboardingStateKey =
  | "state_1_unpersonalized"
  | "state_2_personalized";

export type OnboardingStatus =
  | "never_seen"
  | "in_progress"
  | "dismissed"
  | "completed"
  | "invalidated";

export type AccountOnboardingRecord = {
  userId: string;
  onboardingVersion: number;
  state1Status: OnboardingStatus;
  state1SeenAt: string | null;
  state1CompletedAt: string | null;
  state1DismissedAt: string | null;
  state1InvalidatedAt: string | null;
  state2Status: OnboardingStatus;
  state2SeenAt: string | null;
  state2CompletedAt: string | null;
  state2DismissedAt: string | null;
};

type LocalOnboardingCache = {
  record: AccountOnboardingRecord;
  updatedAt: string;
};

const DEFAULT_STATUS: OnboardingStatus = "never_seen";

function cacheKey(userId: string) {
  return `${LOCAL_CACHE_PREFIX}${userId}`;
}

function createDefaultRecord(userId: string): AccountOnboardingRecord {
  return {
    userId,
    onboardingVersion: ONBOARDING_VERSION,
    state1Status: DEFAULT_STATUS,
    state1SeenAt: null,
    state1CompletedAt: null,
    state1DismissedAt: null,
    state1InvalidatedAt: null,
    state2Status: DEFAULT_STATUS,
    state2SeenAt: null,
    state2CompletedAt: null,
    state2DismissedAt: null,
  };
}

function normalizeStatus(value: unknown): OnboardingStatus {
  switch (value) {
    case "in_progress":
    case "dismissed":
    case "completed":
    case "invalidated":
    case "never_seen":
      return value;
    default:
      return DEFAULT_STATUS;
  }
}

function normalizeRecord(
  userId: string,
  raw: Record<string, unknown> | null | undefined
): AccountOnboardingRecord {
  const base = createDefaultRecord(userId);
  if (!raw) return base;

  return {
    userId,
    onboardingVersion:
      typeof raw.onboarding_version === "number"
        ? raw.onboarding_version
        : ONBOARDING_VERSION,
    state1Status: normalizeStatus(raw.state_1_status),
    state1SeenAt:
      typeof raw.state_1_seen_at === "string" ? raw.state_1_seen_at : null,
    state1CompletedAt:
      typeof raw.state_1_completed_at === "string"
        ? raw.state_1_completed_at
        : null,
    state1DismissedAt:
      typeof raw.state_1_dismissed_at === "string"
        ? raw.state_1_dismissed_at
        : null,
    state1InvalidatedAt:
      typeof raw.state_1_invalidated_at === "string"
        ? raw.state_1_invalidated_at
        : null,
    state2Status: normalizeStatus(raw.state_2_status),
    state2SeenAt:
      typeof raw.state_2_seen_at === "string" ? raw.state_2_seen_at : null,
    state2CompletedAt:
      typeof raw.state_2_completed_at === "string"
        ? raw.state_2_completed_at
        : null,
    state2DismissedAt:
      typeof raw.state_2_dismissed_at === "string"
        ? raw.state_2_dismissed_at
        : null,
  };
}

function hasAnyPersistedSignal(record: AccountOnboardingRecord): boolean {
  return (
    record.state1Status !== DEFAULT_STATUS ||
    record.state2Status !== DEFAULT_STATUS ||
    !!record.state1SeenAt ||
    !!record.state1CompletedAt ||
    !!record.state1DismissedAt ||
    !!record.state1InvalidatedAt ||
    !!record.state2SeenAt ||
    !!record.state2CompletedAt ||
    !!record.state2DismissedAt
  );
}

function isRecentDate(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const createdAt = new Date(iso).getTime();
  if (!Number.isFinite(createdAt)) return false;
  const ageMs = Date.now() - createdAt;
  return ageMs >= 0 && ageMs <= RECENT_ACCOUNT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

async function readLocalCache(
  userId: string
): Promise<AccountOnboardingRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalOnboardingCache;
    if (!parsed?.record || typeof parsed.updatedAt !== "string") return null;
    return normalizeRecord(userId, parsed.record as Record<string, unknown>);
  } catch {
    return null;
  }
}

async function writeLocalCache(
  userId: string,
  record: AccountOnboardingRecord
): Promise<void> {
  try {
    const payload: LocalOnboardingCache = {
      record,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(payload));
  } catch {
    // ignore cache failures
  }
}

export async function clearOnboardingLocalCache(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKey(userId));
  } catch {
    // ignore
  }
}

export async function fetchAccountOnboardingRecordRemote(
  userId: string
): Promise<AccountOnboardingRecord | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_onboarding_state")
    .select(
      [
        "user_id",
        "onboarding_version",
        "state_1_status",
        "state_1_seen_at",
        "state_1_completed_at",
        "state_1_dismissed_at",
        "state_1_invalidated_at",
        "state_2_status",
        "state_2_seen_at",
        "state_2_completed_at",
        "state_2_dismissed_at",
      ].join(",")
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeRecord(userId, data as unknown as Record<string, unknown>);
}

async function fetchProfileCreatedAt(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return typeof (data as { created_at?: unknown } | null)?.created_at === "string"
    ? ((data as { created_at: string }).created_at)
    : null;
}

async function deriveLegacyFallback(
  userId: string
): Promise<AccountOnboardingRecord> {
  const record = createDefaultRecord(userId);
  const [legacyHomeSeen, legacyBudgetSeen, profileCreatedAt] = await Promise.all([
    readTourSeen(userId, "home"),
    readTourSeen(userId, "budget"),
    fetchProfileCreatedAt(userId).catch(() => null),
  ]);

  if (legacyHomeSeen || legacyBudgetSeen) {
    record.state1Status = legacyHomeSeen ? "completed" : "dismissed";
    record.state1SeenAt = new Date().toISOString();
    if (legacyBudgetSeen) {
      record.state2Status = "completed";
      record.state2SeenAt = new Date().toISOString();
      record.state2CompletedAt = new Date().toISOString();
    }
    return record;
  }

  // For legacy users with no persisted onboarding record, leave the state as
  // never_seen so resets and cross-device recovery can deterministically
  // re-qualify the correct onboarding flow. Account age is still computed here
  // for future migration logic, but should not auto-dismiss onboarding.
  if (!isRecentDate(profileCreatedAt)) {
    return record;
  }

  return record;
}

export async function getAccountOnboardingRecord(
  userId: string
): Promise<AccountOnboardingRecord> {
  const local = await readLocalCache(userId);
  if (local && hasAnyPersistedSignal(local)) {
    return local;
  }

  try {
    const remote = await fetchAccountOnboardingRecordRemote(userId);
    if (remote) {
      await writeLocalCache(userId, remote);
      return remote;
    }
  } catch {
    // fall through to legacy fallback
  }

  const fallback = await deriveLegacyFallback(userId);
  await writeLocalCache(userId, fallback);
  return fallback;
}

export async function upsertAccountOnboardingRecord(
  record: AccountOnboardingRecord
): Promise<AccountOnboardingRecord> {
  if (supabase) {
    const payload = {
      user_id: record.userId,
      onboarding_version: record.onboardingVersion,
      state_1_status: record.state1Status,
      state_1_seen_at: record.state1SeenAt,
      state_1_completed_at: record.state1CompletedAt,
      state_1_dismissed_at: record.state1DismissedAt,
      state_1_invalidated_at: record.state1InvalidatedAt,
      state_2_status: record.state2Status,
      state_2_seen_at: record.state2SeenAt,
      state_2_completed_at: record.state2CompletedAt,
      state_2_dismissed_at: record.state2DismissedAt,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_onboarding_state")
      .upsert(payload, { onConflict: "user_id" });

    if (error) throw error;
  }

  await writeLocalCache(record.userId, record);
  return record;
}

export function getOnboardingStatus(
  record: AccountOnboardingRecord,
  stateKey: OnboardingStateKey
): OnboardingStatus {
  return stateKey === "state_1_unpersonalized"
    ? record.state1Status
    : record.state2Status;
}

export function setOnboardingStatus(
  record: AccountOnboardingRecord,
  stateKey: OnboardingStateKey,
  status: OnboardingStatus,
  at = new Date().toISOString()
): AccountOnboardingRecord {
  if (stateKey === "state_1_unpersonalized") {
    return {
      ...record,
      onboardingVersion: ONBOARDING_VERSION,
      state1Status: status,
      state1SeenAt: record.state1SeenAt ?? at,
      state1CompletedAt: status === "completed" ? at : record.state1CompletedAt,
      state1DismissedAt: status === "dismissed" ? at : record.state1DismissedAt,
      state1InvalidatedAt:
        status === "invalidated" ? at : record.state1InvalidatedAt,
    };
  }

  return {
    ...record,
    onboardingVersion: ONBOARDING_VERSION,
    state2Status: status,
    state2SeenAt: record.state2SeenAt ?? at,
    state2CompletedAt: status === "completed" ? at : record.state2CompletedAt,
    state2DismissedAt: status === "dismissed" ? at : record.state2DismissedAt,
  };
}
