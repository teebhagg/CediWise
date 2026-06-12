import { ANALYTICS_EVENTS } from "@/constants/analyticsEvents";
import { getPostHogOptional } from "@/utils/analytics/posthogClientRef";
import { CommonActions } from "@react-navigation/native";
import { router } from "expo-router";
import { store as routerStore } from "expo-router/build/global-state/router-store";
import {
  setPendingNotificationRoute,
  shouldShowNotificationPermissionGate,
} from "@/services/notifications";
import { log } from "./logger";
import { getPostAuthRoute } from "./profileVitals";

/**
 * Leave authenticated stacks and land on `/auth` with a single-screen history so
 * the device back button cannot return to pre-logout screens.
 */
export function resetNavigationToAuth(): void {
  try {
    routerStore.assertIsReady();
    const resetState = routerStore.getStateForHref("/auth");
    if (resetState) {
      routerStore.navigationRef.dispatch(CommonActions.reset(resetState));
      return;
    }
  } catch (e) {
    log.warn("resetNavigationToAuth: CommonActions.reset failed", e);
  }

  try {
    router.dismissAll();
  } catch (e) {
    log.warn("resetNavigationToAuth: dismissAll failed", e);
  }
  router.replace("/auth");
}

/**
 * Central post-login: resolve route from personalization status and navigate.
 * Call after persisting auth and refreshing AuthContext (caller's responsibility).
 */
export async function onLoginSuccess(userId: string): Promise<void> {
  const route = await getPostAuthRoute(userId);
  const showNotificationGate = await shouldShowNotificationPermissionGate();

  if (showNotificationGate) {
    await setPendingNotificationRoute(route);
    router.replace("/notifications");
    getPostHogOptional()?.capture(ANALYTICS_EVENTS.authLoginCompleted, {
      source: "onLoginSuccess",
    });
    return;
  }

  router.replace(route);
  getPostHogOptional()?.capture(ANALYTICS_EVENTS.authLoginCompleted, {
    source: "onLoginSuccess",
  });
}
