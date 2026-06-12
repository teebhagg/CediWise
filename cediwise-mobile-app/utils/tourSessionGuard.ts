import AsyncStorage from "@react-native-async-storage/async-storage";

/** Guards tour/onboarding remote writes during logout or account deletion. */
let tourPersistenceCancelled = false;

/** Post-vitals onboarding: home tour must finish before budget tour. */
type PostVitalsPhase = "home" | "budget";

let postVitalsUserId: string | null = null;
let postVitalsPhase: PostVitalsPhase | null = null;

const postVitalsKey = (userId: string) =>
  `@cediwise_post_vitals_onboarding:${userId}`;

export function cancelTourPersistence(): void {
  tourPersistenceCancelled = true;
  postVitalsUserId = null;
  postVitalsPhase = null;
}

export function resetTourPersistence(): void {
  tourPersistenceCancelled = false;
}

export function isTourPersistenceCancelled(): boolean {
  return tourPersistenceCancelled;
}

/** After vitals finish (first-time): Home tour runs before Budget tour. */
export async function markPostVitalsHomeFirstOnboarding(
  userId: string,
): Promise<void> {
  postVitalsUserId = userId;
  postVitalsPhase = "home";
  try {
    await AsyncStorage.setItem(postVitalsKey(userId), "home");
  } catch {
    // in-memory phase still applies this session
  }
}

export async function hydratePostVitalsHomeFirstOnboarding(
  userId: string,
): Promise<boolean> {
  if (postVitalsUserId === userId && postVitalsPhase) return true;
  try {
    const value = await AsyncStorage.getItem(postVitalsKey(userId));
    if (value === "home" || value === "budget") {
      postVitalsUserId = userId;
      postVitalsPhase = value;
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function isPostVitalsAwaitingHomeTour(
  userId: string | null | undefined,
): boolean {
  return !!userId && postVitalsUserId === userId && postVitalsPhase === "home";
}

export function isPostVitalsAwaitingBudgetTour(
  userId: string | null | undefined,
): boolean {
  return (
    !!userId && postVitalsUserId === userId && postVitalsPhase === "budget"
  );
}

export function isPostVitalsOnboardingActive(
  userId: string | null | undefined,
): boolean {
  return isPostVitalsAwaitingHomeTour(userId) || isPostVitalsAwaitingBudgetTour(userId);
}

/** Home tour finished (or skipped) — budget tour may start next. */
export async function completePostVitalsHomeTour(userId: string): Promise<void> {
  if (postVitalsUserId !== userId) return;
  postVitalsPhase = "budget";
  try {
    await AsyncStorage.setItem(postVitalsKey(userId), "budget");
  } catch {
    // ignore
  }
}

export async function clearPostVitalsHomeFirstOnboarding(
  userId: string,
): Promise<void> {
  if (postVitalsUserId === userId) {
    postVitalsUserId = null;
    postVitalsPhase = null;
  }
  try {
    await AsyncStorage.removeItem(postVitalsKey(userId));
  } catch {
    // ignore
  }
}

/** @deprecated use markPostVitalsHomeFirstOnboarding */
export const markPostVitalsBudgetTourPath = markPostVitalsHomeFirstOnboarding;
/** @deprecated */
export const hydratePostVitalsBudgetTourPath = hydratePostVitalsHomeFirstOnboarding;
/** @deprecated */
export const clearPostVitalsBudgetTourPath = clearPostVitalsHomeFirstOnboarding;
