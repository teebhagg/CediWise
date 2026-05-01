/**
 * Persisted rules for the home-tab periodic feedback prompt.
 * Scoped per signed-in user id.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "@cediwise_feedback_prompt_v1:";

export type FeedbackPromptPersisted = {
  schemaVersion: 1;
  /** Times the user focused the home tab (incremented once per focus). */
  homeFocusCount: number;
  /** ISO timestamp of first home focus (install/session anchor). */
  firstFocusAt: string | null;
  lastDismissedAt: string | null;
  lastSubmittedAt: string | null;
  /** Quick prompt rating submitted from home modal. */
  lastQuickSubmitAt: string | null;
  neverAskAgain: boolean;
  /** App version when we last reset per-version counters (unused for now). */
  lastAppVersion: string | null;
};

const EMPTY: FeedbackPromptPersisted = {
  schemaVersion: 1,
  homeFocusCount: 0,
  firstFocusAt: null,
  lastDismissedAt: null,
  lastSubmittedAt: null,
  lastQuickSubmitAt: null,
  neverAskAgain: false,
  lastAppVersion: null,
};

function key(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

export async function loadFeedbackPromptState(
  userId: string,
): Promise<FeedbackPromptPersisted> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<FeedbackPromptPersisted>;
    if (parsed?.schemaVersion !== 1) return { ...EMPTY };
    return {
      ...EMPTY,
      ...parsed,
      schemaVersion: 1,
    };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveFeedbackPromptState(
  userId: string,
  next: FeedbackPromptPersisted,
): Promise<void> {
  await AsyncStorage.setItem(key(userId), JSON.stringify(next));
}

/** Call after a successful submit from the full feedback screen. */
export async function recordFullFeedbackScreenSubmitted(
  userId: string,
): Promise<void> {
  const prev = await loadFeedbackPromptState(userId);
  await saveFeedbackPromptState(userId, {
    ...prev,
    lastSubmittedAt: new Date().toISOString(),
  });
}
