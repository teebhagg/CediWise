import { router } from "expo-router";
// Full tree state for a path (used so back cannot return to pre-auth screens).
import { store } from "expo-router/build/global-state/router-store";
import { getPostAuthRoute } from "./profileVitals";
import {
  hasNotificationGateCompleted,
  setPendingNotificationRoute,
} from "@/services/notifications";
import { log } from "./logger";

/**
 * Reset the root navigation state to `/auth` so the stack does not retain
 * authenticated routes (unlike `router.replace`, which only swaps the top screen).
 */
export function resetNavigationToAuth(): void {
  try {
    const state = store.getStateForHref("/auth");
    if (state && store.navigationRef.isReady()) {
      store.navigationRef.resetRoot(state);
      return;
    }
  } catch (e) {
    log.warn("resetNavigationToAuth: resetRoot failed, falling back to replace", e);
  }
  router.replace("/auth");
}

/**
 * Central post-login: resolve route from personalization status and navigate.
 * Call after persisting auth and refreshing AuthContext (caller's responsibility).
 */
export async function onLoginSuccess(userId: string): Promise<void> {
  const route = await getPostAuthRoute(userId);
  const notificationGateCompleted = await hasNotificationGateCompleted();

  if (!notificationGateCompleted) {
    await setPendingNotificationRoute(route);
    router.replace("/notifications");
    return;
  }

  router.replace(route);
}
