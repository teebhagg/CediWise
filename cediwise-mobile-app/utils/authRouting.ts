import { ANALYTICS_EVENTS } from "@/constants/analyticsEvents";
import { getPostHogOptional } from "@/utils/analytics/posthogClientRef";
import { router } from "expo-router";
import {
  hasNotificationGateCompleted,
  setPendingNotificationRoute,
} from "@/services/notifications";
import { log } from "./logger";
import { getPostAuthRoute } from "./profileVitals";

/**
 * Leave authenticated stacks and land on `/auth` using the public Expo Router API.
 * `dismissTo` collapses nested stacks toward `/auth` when that route exists in
 * history; `replace` then pins the root to auth so back cannot return to
 * pre-logout screens (per Expo Router `dismissTo` / `replace` semantics).
 */
export function resetNavigationToAuth(): void {
  try {
    router.dismissTo("/auth");
    return; 
  } catch (e) {
    log.warn("resetNavigationToAuth: dismissTo failed", e);
    router.replace("/auth");
  }
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
