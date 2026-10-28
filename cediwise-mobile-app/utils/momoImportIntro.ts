import AsyncStorage from "@react-native-async-storage/async-storage";

import type { OnboardingStatus } from "@/utils/onboardingState";

const HOME_INTRO_PREFIX = "@cediwise/momo-import-home-intro-seen:";
const STEPS_PREFIX = "@cediwise/momo-import-steps-seen:";

/** `in_progress` counts: the home tour leaves that status when it sends you to Budget. */
const INTRO_STATUSES = new Set<OnboardingStatus>([
  "in_progress",
  "dismissed",
  "completed",
  "invalidated",
]);

export function shouldShowMoMoImportIntro(input: {
  userId: string | null | undefined;
  seen: boolean;
  onboardingLoaded: boolean;
  isTourActive: boolean;
  onboardingStatus: OnboardingStatus | null;
  feedbackPromptVisible: boolean;
}): boolean {
  return Boolean(
    input.userId &&
      !input.seen &&
      input.onboardingLoaded &&
      !input.isTourActive &&
      !input.feedbackPromptVisible &&
      input.onboardingStatus &&
      INTRO_STATUSES.has(input.onboardingStatus),
  );
}

async function readSeen(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === "1";
  } catch {
    return false;
  }
}

async function writeSeen(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, "1");
  } catch {
    // A failed write can show the sheet again on the next cold start.
  }
}

export function readMomoImportHomeIntroSeen(userId: string) {
  return readSeen(`${HOME_INTRO_PREFIX}${userId}`);
}

export function markMomoImportHomeIntroSeen(userId: string) {
  return writeSeen(`${HOME_INTRO_PREFIX}${userId}`);
}

export function readMomoImportStepsSeen(userId: string) {
  return readSeen(`${STEPS_PREFIX}${userId}`);
}

export function markMomoImportStepsSeen(userId: string) {
  return writeSeen(`${STEPS_PREFIX}${userId}`);
}

export async function clearMomoImportIntros(userId: string): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      `${HOME_INTRO_PREFIX}${userId}`,
      `${STEPS_PREFIX}${userId}`,
    ]);
  } catch {
    // Dev reset can be tried again.
  }
}
